import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "./config";
import { ChatMessage, ChatGroup, ChatAttachment, ProfitUpdateData, MistakeReportData } from "@/types/chat";

const GROUPS_COLLECTION = "chatGroups";
const MESSAGES_COLLECTION = "messages";
const CHAT_FILES_FOLDER = "chatFiles";

// ==================== Groups ====================

export async function createGroup(
  name: string,
  createdBy: string,
  memberIds: string[],
  description?: string,
  isPrivate: boolean = false
): Promise<string> {
  try {
    const groupData = {
      name,
      description: description || "",
      createdBy,
      createdAt: serverTimestamp(),
      members: [createdBy, ...memberIds], // Include creator
      isPrivate,
      lastMessage: null,
      avatarUrl: "/logo/SkillCityQ 1.png", // Default to company logo
    };

    const docRef = await addDoc(collection(db, GROUPS_COLLECTION), groupData);
    return docRef.id;
  } catch (error) {
    console.error("Error creating group:", error);
    throw error;
  }
}

export async function getGroup(groupId: string): Promise<ChatGroup | null> {
  try {
    const docRef = doc(db, GROUPS_COLLECTION, groupId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    const data = docSnap.data();
    return {
      id: docSnap.id,
      name: data.name,
      description: data.description,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate() || new Date(),
      members: data.members || [],
      isPrivate: data.isPrivate || false,
      avatarUrl: data.avatarUrl || "/logo/SkillCityQ 1.png", // Default to company logo if not set
      lastMessage: data.lastMessage
        ? {
            content: data.lastMessage.content,
            senderName: data.lastMessage.senderName,
            createdAt: data.lastMessage.createdAt?.toDate() || new Date(),
          }
        : undefined,
    } as ChatGroup;
  } catch (error) {
    console.error("Error getting group:", error);
    throw error;
  }
}

export async function getUserGroups(userId: string): Promise<ChatGroup[]> {
  try {
    const q = query(
      collection(db, GROUPS_COLLECTION),
      where("members", "array-contains", userId)
    );
    const querySnapshot = await getDocs(q);
    const groups: ChatGroup[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        members: data.members || [],
        isPrivate: data.isPrivate || false,
        avatarUrl: data.avatarUrl || "/logo/SkillCityQ 1.png", // Default to company logo if not set
        lastMessage: data.lastMessage
          ? {
              content: data.lastMessage.content,
              senderName: data.lastMessage.senderName,
              createdAt: data.lastMessage.createdAt?.toDate() || new Date(),
            }
          : undefined,
      } as ChatGroup);
    });

    // Sort in memory by lastMessage.createdAt (newest first)
    return groups.sort((a, b) => {
      const aDate = a.lastMessage?.createdAt || a.createdAt;
      const bDate = b.lastMessage?.createdAt || b.createdAt;
      return bDate.getTime() - aDate.getTime();
    });
  } catch (error) {
    console.error("Error getting user groups:", error);
    throw error;
  }
}

export function subscribeToUserGroups(
  userId: string,
  callback: (groups: ChatGroup[]) => void
): () => void {
  const q = query(
    collection(db, GROUPS_COLLECTION),
    where("members", "array-contains", userId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const groups: ChatGroup[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      groups.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        createdBy: data.createdBy,
        createdAt: data.createdAt?.toDate() || new Date(),
        members: data.members || [],
        isPrivate: data.isPrivate || false,
        avatarUrl: data.avatarUrl || "/logo/SkillCityQ 1.png", // Default to company logo if not set
        lastMessage: data.lastMessage
          ? {
              content: data.lastMessage.content,
              senderName: data.lastMessage.senderName,
              createdAt: data.lastMessage.createdAt?.toDate() || new Date(),
            }
          : undefined,
      } as ChatGroup);
    });
    
    // Sort in memory by lastMessage.createdAt (newest first)
    const sortedGroups = groups.sort((a, b) => {
      const aDate = a.lastMessage?.createdAt || a.createdAt;
      const bDate = b.lastMessage?.createdAt || b.createdAt;
      return bDate.getTime() - aDate.getTime();
    });
    
    callback(sortedGroups);
  });
}

export async function addMembersToGroup(groupId: string, memberIds: string[]): Promise<void> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(...memberIds),
    });
  } catch (error) {
    console.error("Error adding members to group:", error);
    throw error;
  }
}

export async function removeMemberFromGroup(groupId: string, memberId: string): Promise<void> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      members: arrayRemove(memberId),
    });
  } catch (error) {
    console.error("Error removing member from group:", error);
    throw error;
  }
}

export async function updateGroup(
  groupId: string,
  updates: Partial<Pick<ChatGroup, "name" | "description" | "avatarUrl">>
): Promise<void> {
  try {
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating group:", error);
    throw error;
  }
}

// ==================== Messages ====================

export async function sendMessage(
  groupId: string,
  senderId: string,
  senderName: string,
  senderEmail: string,
  content: string,
  type: ChatMessage["type"] = "text",
  attachments?: ChatAttachment[],
  profitData?: ProfitUpdateData,
  mistakeData?: MistakeReportData
): Promise<string> {
  try {
    const messageData: any = {
      groupId,
      senderId,
      senderName,
      senderEmail,
      content,
      type,
      createdAt: serverTimestamp(),
      readBy: [senderId], // Sender has read their own message
    };

    if (attachments && attachments.length > 0) {
      messageData.attachments = attachments;
    }

    if (profitData) {
      messageData.profitData = profitData;
    }

    if (mistakeData) {
      messageData.mistakeData = mistakeData;
    }

    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), messageData);

    // Update group's last message
    const groupRef = doc(db, GROUPS_COLLECTION, groupId);
    await updateDoc(groupRef, {
      lastMessage: {
        content: type === "profit_update" ? "Profit update shared" : 
                 type === "mistake_report" ? "Mistake reported" : 
                 content.substring(0, 100),
        senderName,
        createdAt: serverTimestamp(),
      },
    });

    return docRef.id;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
}

export async function getMessages(groupId: string, limitCount: number = 50): Promise<ChatMessage[]> {
  try {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where("groupId", "==", groupId)
    );
    const querySnapshot = await getDocs(q);
    const messages: ChatMessage[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        groupId: data.groupId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        content: data.content,
        type: data.type || "text",
        attachments: data.attachments || [],
        profitData: data.profitData,
        mistakeData: data.mistakeData,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        readBy: data.readBy || [],
      } as ChatMessage);
    });

    // Sort by createdAt ascending (chronological order) and limit
    const sortedMessages = messages.sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );
    
    // Return last N messages (most recent)
    return sortedMessages.slice(-limitCount);
  } catch (error) {
    console.error("Error getting messages:", error);
    throw error;
  }
}

export function subscribeToMessages(
  groupId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where("groupId", "==", groupId)
  );

  return onSnapshot(q, (querySnapshot) => {
    const messages: ChatMessage[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        groupId: data.groupId,
        senderId: data.senderId,
        senderName: data.senderName,
        senderEmail: data.senderEmail,
        content: data.content,
        type: data.type || "text",
        attachments: data.attachments || [],
        profitData: data.profitData,
        mistakeData: data.mistakeData,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate(),
        readBy: data.readBy || [],
      } as ChatMessage);
    });
    
    // Sort by createdAt ascending (chronological order) for display
    const sortedMessages = messages.sort((a, b) => 
      a.createdAt.getTime() - b.createdAt.getTime()
    );
    
    callback(sortedMessages);
  });
}

export async function markMessageAsRead(messageId: string, userId: string): Promise<void> {
  try {
    const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
    await updateDoc(messageRef, {
      readBy: arrayUnion(userId),
    });
  } catch (error) {
    console.error("Error marking message as read:", error);
    throw error;
  }
}

export async function deleteMessage(messageId: string): Promise<void> {
  try {
    const messageRef = doc(db, MESSAGES_COLLECTION, messageId);
    await deleteDoc(messageRef);
  } catch (error) {
    console.error("Error deleting message:", error);
    throw error;
  }
}

// ==================== File Uploads ====================

export async function uploadChatFile(
  file: File,
  groupId: string,
  messageId: string
): Promise<ChatAttachment> {
  try {
    const fileExtension = file.name.split(".").pop();
    const fileName = `${groupId}/${messageId}_${Date.now()}.${fileExtension}`;
    const storageRef = ref(storage, `${CHAT_FILES_FOLDER}/${fileName}`);

    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);

    return {
      id: messageId,
      name: file.name,
      url: downloadURL,
      type: file.type.startsWith("image/") ? "image" : "file",
      size: file.size,
      mimeType: file.type,
    };
  } catch (error) {
    console.error("Error uploading chat file:", error);
    throw error;
  }
}

// ==================== Profit Updates ====================

export async function getTodayProfit(): Promise<ProfitUpdateData | null> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // This would typically fetch from your invoices and payroll collections
    // For now, we'll return a structure that can be populated
    // You'll need to integrate with your actual data sources
    return {
      date: todayStr,
      revenue: 0,
      expenses: 0,
      profit: 0,
    };
  } catch (error) {
    console.error("Error getting today's profit:", error);
    throw error;
  }
}

