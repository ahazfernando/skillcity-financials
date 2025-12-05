"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createGroup,
  getUserGroups,
  subscribeToUserGroups,
  sendMessage,
  subscribeToMessages,
  uploadChatFile,
  addMembersToGroup,
  getGroup,
} from "@/lib/firebase/chat";
import { getAllUsers } from "@/lib/firebase/users";
import { getAllInvoices } from "@/lib/firebase/invoices";
import { getAllPayrolls } from "@/lib/firebase/payroll";
import { ChatMessage, ChatGroup, ProfitUpdateData, MistakeReportData } from "@/types/chat";
import { UserData } from "@/lib/authService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Users,
  Plus,
  DollarSign,
  AlertTriangle,
  X,
  FileText,
  Download,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

const Chat = () => {
  const { user, userData } = useAuth();
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageContent, setMessageContent] = useState("");
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    // Load users for group creation
    getAllUsers().then(setAllUsers).catch(console.error);

    // Subscribe to groups
    const unsubscribeGroups = subscribeToUserGroups(user.uid, (updatedGroups) => {
      setGroups(updatedGroups);
      if (selectedGroup && !updatedGroups.find((g) => g.id === selectedGroup.id)) {
        setSelectedGroup(null);
        setMessages([]);
      }
    });

    return () => {
      unsubscribeGroups();
    };
  }, [user, selectedGroup]);

  useEffect(() => {
    if (!selectedGroup || !user) return;

    // Subscribe to messages
    const unsubscribeMessages = subscribeToMessages(selectedGroup.id, (updatedMessages) => {
      setMessages(updatedMessages);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => {
      unsubscribeMessages();
    };
  }, [selectedGroup, user]);

  const handleCreateGroup = async () => {
    if (!user || !newGroupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    try {
      const groupId = await createGroup(
        newGroupName.trim(),
        user.uid,
        newGroupMembers,
        "",
        false
      );
      toast.success("Group created successfully!");
      setIsCreatingGroup(false);
      setNewGroupName("");
      setNewGroupMembers([]);

      // Select the newly created group
      const newGroup = await getGroup(groupId);
      if (newGroup) {
        setSelectedGroup(newGroup);
      }
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group");
    }
  };

  const handleSendMessage = async () => {
    if (!user || !userData || !selectedGroup || !messageContent.trim() && selectedFiles.length === 0) {
      return;
    }

    try {
      let attachments: any[] = [];

      // Upload files if any
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        const uploadPromises = selectedFiles.map(async (file) => {
          const tempMessageId = `temp_${Date.now()}_${Math.random()}`;
          return await uploadChatFile(file, selectedGroup.id, tempMessageId);
        });
        attachments = await Promise.all(uploadPromises);
        setSelectedFiles([]);
        setIsUploading(false);
      }

      await sendMessage(
        selectedGroup.id,
        user.uid,
        userData.name || user.email || "Unknown",
        user.email || "",
        messageContent.trim() || (attachments.length > 0 ? "Shared file(s)" : ""),
        attachments.length > 0 && attachments[0].type === "image" ? "image" : attachments.length > 0 ? "file" : "text",
        attachments.length > 0 ? attachments : undefined
      );

      setMessageContent("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
      setIsUploading(false);
    }
  };

  const handleSendProfitUpdate = async () => {
    if (!user || !userData || !selectedGroup) return;

    try {
      // Calculate today's profit
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split("T")[0];

      const [invoices, payrolls] = await Promise.all([
        getAllInvoices(),
        getAllPayrolls(),
      ]);

      const todayRevenue = invoices
        .filter(
          (inv) =>
            inv.status === "received" &&
            new Date(inv.issueDate).toISOString().split("T")[0] === todayStr
        )
        .reduce((sum, inv) => sum + inv.totalAmount, 0);

      const todayExpenses = payrolls
        .filter(
          (pay) =>
            pay.modeOfCashFlow === "outflow" &&
            pay.status === "received" &&
            new Date(pay.date.split(".").reverse().join("-")).toISOString().split("T")[0] === todayStr
        )
        .reduce((sum, pay) => sum + pay.totalAmount, 0);

      const todayProfit = todayRevenue - todayExpenses;

      const profitData: ProfitUpdateData = {
        date: todayStr,
        revenue: todayRevenue,
        expenses: todayExpenses,
        profit: todayProfit,
        revenueBreakdown: {
          invoices: todayRevenue,
          other: 0,
        },
        expenseBreakdown: {
          payroll: todayExpenses,
          other: 0,
        },
      };

      await sendMessage(
        selectedGroup.id,
        user.uid,
        userData.name || user.email || "Unknown",
        user.email || "",
        `Today's Profit Update: ${formatCurrency(todayProfit)}`,
        "profit_update",
        undefined,
        profitData
      );

      toast.success("Profit update sent!");
    } catch (error) {
      console.error("Error sending profit update:", error);
      toast.error("Failed to send profit update");
    }
  };

  const handleReportMistake = async (mistakeData: MistakeReportData) => {
    if (!user || !userData || !selectedGroup) return;

    try {
      await sendMessage(
        selectedGroup.id,
        user.uid,
        userData.name || user.email || "Unknown",
        user.email || "",
        `Mistake Reported: ${mistakeData.description}`,
        "mistake_report",
        undefined,
        undefined,
        mistakeData
      );

      toast.success("Mistake reported!");
    } catch (error) {
      console.error("Error reporting mistake:", error);
      toast.error("Failed to report mistake");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, isImage: boolean) => {
    const files = Array.from(e.target.files || []);
    if (isImage) {
      const imageFiles = files.filter((f) => f.type.startsWith("image/"));
      setSelectedFiles((prev) => [...prev, ...imageFiles]);
    } else {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
    // Reset input
    if (e.target) {
      e.target.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const messageDate = new Date(date);
    messageDate.setHours(0, 0, 0, 0);

    if (messageDate.getTime() === today.getTime()) {
      return "Today";
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (messageDate.getTime() === yesterday.getTime()) {
      return "Yesterday";
    }
    return messageDate.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: messageDate.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Please sign in to use chat</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] border rounded-lg overflow-hidden">
      {/* Groups Sidebar */}
      <div className="w-80 border-r bg-muted/30 flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chat Groups</h2>
          <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Group
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                  Create a new chat group and add members
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="groupName">Group Name</Label>
                  <Input
                    id="groupName"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <Label>Add Members</Label>
                  <Select
                    onValueChange={(value) => {
                      if (!newGroupMembers.includes(value)) {
                        setNewGroupMembers([...newGroupMembers, value]);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select members" />
                    </SelectTrigger>
                    <SelectContent>
                      {allUsers
                        .filter((u) => u.uid !== user.uid)
                        .map((u) => (
                          <SelectItem key={u.uid} value={u.uid}>
                            {u.name || u.email}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {newGroupMembers.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {newGroupMembers.map((memberId) => {
                        const member = allUsers.find((u) => u.uid === memberId);
                        return (
                          <Badge key={memberId} variant="secondary" className="gap-1">
                            {member?.name || member?.email || memberId}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() =>
                                setNewGroupMembers(
                                  newGroupMembers.filter((id) => id !== memberId)
                                )
                              }
                            />
                          </Badge>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreatingGroup(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup}>Create Group</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {groups.map((group) => (
              <div
                key={group.id}
                onClick={() => setSelectedGroup(group)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedGroup?.id === group.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage 
                      src={group.avatarUrl || "/logo/SkillCityQ 1.png"} 
                      alt={group.name}
                    />
                    <AvatarFallback>
                      {group.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{group.name}</p>
                    {group.lastMessage && (
                      <p className="text-xs opacity-70 truncate">
                        {group.lastMessage.senderName}: {group.lastMessage.content}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {groups.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No groups yet</p>
                <p className="text-sm">Create a group to start chatting</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedGroup ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarImage 
                    src={selectedGroup.avatarUrl || "/logo/SkillCityQ 1.png"} 
                    alt={selectedGroup.name}
                  />
                  <AvatarFallback>
                    {selectedGroup.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedGroup.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedGroup.members.length} members
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Users className="h-4 w-4 mr-2" />
                      Add Members
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Members to Group</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <Select
                        onValueChange={async (value) => {
                          try {
                            await addMembersToGroup(selectedGroup.id, [value]);
                            toast.success("Member added!");
                          } catch (error) {
                            toast.error("Failed to add member");
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a user" />
                        </SelectTrigger>
                        <SelectContent>
                          {allUsers
                            .filter(
                              (u) =>
                                u.uid !== user.uid &&
                                !selectedGroup.members.includes(u.uid)
                            )
                            .map((u) => (
                              <SelectItem key={u.uid} value={u.uid}>
                                {u.name || u.email}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message, index) => {
                  const isOwnMessage = message.senderId === user.uid;
                  const showDate =
                    index === 0 ||
                    formatDate(messages[index - 1].createdAt) !==
                      formatDate(message.createdAt);

                  return (
                    <div key={message.id}>
                      {showDate && (
                        <div className="text-center text-sm text-muted-foreground my-4">
                          {formatDate(message.createdAt)}
                        </div>
                      )}
                      <div
                        className={`flex gap-3 ${
                          isOwnMessage ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>
                            {message.senderName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`flex flex-col max-w-[70%] ${
                            isOwnMessage ? "items-end" : "items-start"
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium">
                              {message.senderName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {formatTime(message.createdAt)}
                            </span>
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              isOwnMessage
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {message.type === "profit_update" && message.profitData && (
                              <Card className="mb-2 bg-background text-foreground">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <DollarSign className="h-4 w-4" />
                                    Today's Profit Update
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span>Revenue:</span>
                                    <span className="font-semibold text-green-600">
                                      {formatCurrency(message.profitData.revenue)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Expenses:</span>
                                    <span className="font-semibold text-red-600">
                                      {formatCurrency(message.profitData.expenses)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between border-t pt-2">
                                    <span>Net Profit:</span>
                                    <span className="font-bold text-lg">
                                      {formatCurrency(message.profitData.profit)}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {message.type === "mistake_report" && message.mistakeData && (
                              <Card className="mb-2 bg-background text-foreground">
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    Mistake Reported
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                  <div>
                                    <span className="font-medium">Type: </span>
                                    <Badge variant="outline">
                                      {message.mistakeData.type.replace("_", " ")}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="font-medium">Severity: </span>
                                    <Badge
                                      variant={
                                        message.mistakeData.severity === "critical"
                                          ? "destructive"
                                          : message.mistakeData.severity === "high"
                                          ? "default"
                                          : "secondary"
                                      }
                                    >
                                      {message.mistakeData.severity}
                                    </Badge>
                                  </div>
                                  <div>
                                    <span className="font-medium">Description: </span>
                                    <p>{message.mistakeData.description}</p>
                                  </div>
                                  {message.mistakeData.affectedAmount && (
                                    <div>
                                      <span className="font-medium">Affected Amount: </span>
                                      {formatCurrency(message.mistakeData.affectedAmount)}
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            )}

                            {message.attachments && message.attachments.length > 0 && (
                              <div className="space-y-2 mb-2">
                                {message.attachments.map((attachment) => (
                                  <div key={attachment.id} className="space-y-1">
                                    {attachment.type === "image" ? (
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name}
                                        className="max-w-full rounded-lg max-h-64 object-cover"
                                      />
                                    ) : (
                                      <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-2 bg-background rounded border hover:bg-muted"
                                      >
                                        <FileText className="h-4 w-4" />
                                        <span className="text-sm">{attachment.name}</span>
                                        <Download className="h-3 w-3 ml-auto" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {message.content && (
                              <p className="whitespace-pre-wrap">{message.content}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t space-y-2">
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 bg-muted rounded border"
                    >
                      {file.type.startsWith("image/") ? (
                        <ImageIcon className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                      <span className="text-sm truncate max-w-[150px]">{file.name}</span>
                      <X
                        className="h-4 w-4 cursor-pointer"
                        onClick={() => removeFile(index)}
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={handleSendProfitUpdate}
                    title="Send today's profit update"
                  >
                    <DollarSign className="h-4 w-4" />
                  </Button>
                  <MistakeReportDialog onReport={handleReportMistake} />
                </div>
                <Textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type a message..."
                  className="flex-1 min-h-[60px]"
                  disabled={isUploading}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={(!messageContent.trim() && selectedFiles.length === 0) || isUploading}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, true)}
              />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFileSelect(e, false)}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a group to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Mistake Report Dialog Component
const MistakeReportDialog = ({
  onReport,
}: {
  onReport: (data: MistakeReportData) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<MistakeReportData["type"]>("other");
  const [severity, setSeverity] = useState<MistakeReportData["severity"]>("medium");
  const [description, setDescription] = useState("");
  const [affectedAmount, setAffectedAmount] = useState("");

  const handleSubmit = () => {
    if (!description.trim()) {
      toast.error("Please provide a description");
      return;
    }

    onReport({
      type,
      severity,
      description: description.trim(),
      affectedAmount: affectedAmount ? parseFloat(affectedAmount) : undefined,
      status: "reported",
    });

    setOpen(false);
    setType("other");
    setSeverity("medium");
    setDescription("");
    setAffectedAmount("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="outline" title="Report a mistake">
          <AlertTriangle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a Mistake</DialogTitle>
          <DialogDescription>
            Report any mistakes or issues found in profit calculations or data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Mistake Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calculation_error">Calculation Error</SelectItem>
                <SelectItem value="data_entry_error">Data Entry Error</SelectItem>
                <SelectItem value="missing_data">Missing Data</SelectItem>
                <SelectItem value="duplicate_entry">Duplicate Entry</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the mistake..."
              rows={4}
            />
          </div>
          <div>
            <Label>Affected Amount (AUD)</Label>
            <Input
              type="number"
              value={affectedAmount}
              onChange={(e) => setAffectedAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Report Mistake</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Chat;

