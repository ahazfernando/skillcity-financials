"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  createGroup,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  Search,
  MoreVertical,
  ArrowLeft,
  Check,
  CheckCheck,
  MessageSquare,
  Loader2,
  Sparkles,
  TrendingUp,
  Clock,
  UserPlus,
  Settings,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [showConversations, setShowConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!user) return;

    getAllUsers().then(setAllUsers).catch(console.error);

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

    if (isMobile !== undefined && isMobile) {
      setShowConversations(false);
    }

    const unsubscribeMessages = subscribeToMessages(selectedGroup.id, (updatedMessages) => {
      setMessages(updatedMessages);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => {
      unsubscribeMessages();
    };
  }, [selectedGroup, user, isMobile]);

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
    if (!user || !userData || !selectedGroup || (!messageContent.trim() && selectedFiles.length === 0)) {
      return;
    }

    try {
      let attachments: any[] = [];

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

  const filteredGroups = groups.filter((group) =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Please sign in to use chat</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-3.5rem-4rem)] md:h-[calc(100vh-3.5rem)] overflow-hidden">
      <div className="flex h-full bg-gradient-to-br from-background via-background to-muted/30 w-full max-w-full">
        {/* NEW DESIGN: Conversations Sidebar - Card Based */}
      <div
        className={cn(
          "transition-all duration-300 flex flex-col border-r border-border/50",
          isMobile === undefined
            ? "w-full sm:w-80 md:w-96 flex"
            : isMobile
            ? showConversations
              ? "fixed inset-0 z-50 w-full sm:w-80 md:relative md:z-auto md:w-96"
              : "hidden md:flex md:w-96"
            : "w-80 md:w-96 flex"
        )}
      >
        {/* Modern Header with Gradient */}
        <div className="relative p-6 sm:p-8 bg-gradient-to-br from-primary/20 via-primary/10 to-background border-b border-primary/20 flex-shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent"></div>
          <div className="relative flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-primary" />
                Conversations
              </h1>
              <p className="text-sm text-muted-foreground">{groups.length} active chats</p>
            </div>
            <Dialog open={isCreatingGroup} onOpenChange={setIsCreatingGroup}>
              <DialogTrigger asChild>
                <Button 
                  size="icon" 
                  className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all"
                >
                  <Plus className="h-6 w-6" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>
                    Create a new chat group and add members to start collaborating
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="groupName">Group Name</Label>
                    <Input
                      id="groupName"
                      value={newGroupName}
                      onChange={(e) => setNewGroupName(e.target.value)}
                      placeholder="Enter group name"
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Add Members</Label>
                    <Select
                      onValueChange={(value) => {
                        if (!newGroupMembers.includes(value)) {
                          setNewGroupMembers([...newGroupMembers, value]);
                        }
                      }}
                    >
                      <SelectTrigger className="h-11">
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
                      <div className="flex flex-wrap gap-2 mt-3">
                        {newGroupMembers.map((memberId) => {
                          const member = allUsers.find((u) => u.uid === memberId);
                          return (
                            <Badge key={memberId} variant="secondary" className="gap-1.5 px-3 py-1.5">
                              {member?.name || member?.email || memberId}
                              <X
                                className="h-3.5 w-3.5 cursor-pointer hover:text-destructive transition-colors"
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
          
          {/* Enhanced Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-background/80 backdrop-blur-sm border-primary/20 focus:border-primary/50 focus:bg-background transition-all"
            />
          </div>
        </div>

        {/* Card-Based Conversation List */}
        <ScrollArea className="flex-1 px-3 sm:px-4 md:px-6 py-4">
          <div className="space-y-3">
            {filteredGroups.map((group) => {
              const isSelected = selectedGroup?.id === group.id;
              return (
                <Card
                  key={group.id}
                  onClick={() => {
                    setSelectedGroup(group);
                    if (isMobile) {
                      setShowConversations(false);
                    }
                  }}
                  className={cn(
                    "cursor-pointer transition-all duration-200 hover:shadow-lg border-2",
                    isSelected
                      ? "bg-primary/10 border-primary shadow-lg scale-[1.02]"
                      : "hover:border-primary/30 hover:bg-card/50 border-border/50"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-14 w-14 flex-shrink-0 ring-2 ring-background shadow-md">
                        <AvatarImage
                          src={group.avatarUrl || "/logo/SkillCityQ 1.png"}
                          alt={group.name}
                        />
                        <AvatarFallback className="text-base font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                          {group.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold text-base truncate">{group.name}</h3>
                          {group.lastMessage && (
                            <span className="text-xs text-muted-foreground ml-2 flex-shrink-0 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(group.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        {group.lastMessage ? (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            <span className="font-semibold text-foreground/80">{group.lastMessage.senderName}:</span>{" "}
                            {group.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground italic">Start a conversation...</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {group.members.length}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filteredGroups.length === 0 && (
              <div className="text-center py-16 px-4">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 mb-4">
                  <MessageSquare className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
                <p className="text-sm text-muted-foreground mb-6">Create your first group to get started</p>
                <Button onClick={() => setIsCreatingGroup(true)} className="rounded-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* NEW DESIGN: Chat Area - Modern Layout */}
      <div className={cn(
        "flex-1 flex flex-col transition-all duration-300 w-full bg-background max-w-full relative",
        isMobile !== undefined && isMobile && showConversations ? "hidden md:flex" : "flex"
      )}>
        {selectedGroup ? (
          <>
            {/* Modern Chat Header */}
            <div className="h-16 sm:h-20 border-b bg-gradient-to-r from-card via-card to-background flex items-center justify-between px-4 sm:px-6 md:px-8 flex-shrink-0 shadow-sm">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                {isMobile && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowConversations(true)}
                    className="h-10 w-10 rounded-full md:hidden"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <Avatar className="h-12 w-12 sm:h-14 sm:w-14 flex-shrink-0 ring-2 ring-primary/20 shadow-md">
                  <AvatarImage
                    src={selectedGroup.avatarUrl || "/logo/SkillCityQ 1.png"}
                    alt={selectedGroup.name}
                  />
                  <AvatarFallback className="text-base font-bold bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">
                    {selectedGroup.name.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-lg sm:text-xl truncate">{selectedGroup.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {selectedGroup.members.length} {selectedGroup.members.length === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="h-10 w-10 rounded-full"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Group Settings</DialogTitle>
                    <DialogDescription>
                      Manage group members and settings
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div>
                      <Label>Add Members</Label>
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
                        <SelectTrigger className="h-11 mt-2">
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
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Messages Area - Modern Bubble Design */}
            <div className={cn(
              "flex-1 overflow-y-auto bg-gradient-to-b from-background via-background to-muted/10",
              isMobile ? "pb-36" : "pb-0"
            )}>
              <div className="w-full max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-6">
                {messages.map((message, index) => {
                  const isOwnMessage = message.senderId === user.uid;
                  const showDate =
                    index === 0 ||
                    formatDate(messages[index - 1].createdAt) !==
                      formatDate(message.createdAt);
                  const showAvatar =
                    !isOwnMessage &&
                    (index === messages.length - 1 ||
                      messages[index + 1].senderId !== message.senderId ||
                      new Date(messages[index + 1].createdAt).getTime() -
                        new Date(message.createdAt).getTime() >
                        300000);

                  return (
                    <div key={message.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      {showDate && (
                        <div className="flex items-center justify-center my-8">
                          <div className="px-4 py-2 bg-muted/80 backdrop-blur-sm rounded-full border border-border/50">
                            <span className="text-xs font-semibold text-muted-foreground">
                              {formatDate(message.createdAt)}
                            </span>
                          </div>
                        </div>
                      )}
                      <div
                        className={cn(
                          "flex gap-3 items-end group",
                          isOwnMessage ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        {!isOwnMessage && (
                          <Avatar
                            className={cn(
                              "h-8 w-8 flex-shrink-0 transition-opacity ring-2 ring-background",
                              showAvatar ? "opacity-100" : "opacity-0 pointer-events-none"
                            )}
                          >
                            <AvatarFallback className="text-[10px] font-semibold bg-primary/10 text-primary">
                              {message.senderName.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        <div
                          className={cn(
                            "flex flex-col max-w-[80%] sm:max-w-[70%] md:max-w-[60%]",
                            isOwnMessage ? "items-end" : "items-start"
                          )}
                        >
                          {!isOwnMessage && showAvatar && (
                            <span className="text-xs font-semibold text-muted-foreground mb-2 px-1">
                              {message.senderName}
                            </span>
                          )}
                          <div
                            className={cn(
                              "rounded-3xl px-5 py-3 shadow-md transition-all duration-200",
                              isOwnMessage
                                ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground rounded-tr-md"
                                : "bg-card border-2 border-border/50 rounded-tl-md"
                            )}
                          >
                            {/* Profit Update Card */}
                            {message.type === "profit_update" && message.profitData && (
                              <Card className="mb-3 bg-background/90 text-foreground border-2 border-primary/20 shadow-lg">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-green-600/10">
                                      <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                                    </div>
                                    Today's Profit Update
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm pt-0">
                                  <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                                    <span className="text-muted-foreground">Revenue:</span>
                                    <span className="font-bold text-green-600 dark:text-green-400 text-base">
                                      {formatCurrency(message.profitData.revenue)}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                                    <span className="text-muted-foreground">Expenses:</span>
                                    <span className="font-bold text-red-600 dark:text-red-400 text-base">
                                      {formatCurrency(message.profitData.expenses)}
                                    </span>
                                  </div>
                                  <Separator className="my-2" />
                                  <div className="flex justify-between items-center p-3 rounded-xl bg-primary/10 border-2 border-primary/20">
                                    <span className="font-semibold">Net Profit:</span>
                                    <span className="font-bold text-xl text-primary">
                                      {formatCurrency(message.profitData.profit)}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            )}

                            {/* Mistake Report Card */}
                            {message.type === "mistake_report" && message.mistakeData && (
                              <Card className="mb-3 bg-background/90 text-foreground border-2 border-yellow-500/20 shadow-lg">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-base flex items-center gap-2">
                                    <div className="p-2 rounded-xl bg-gradient-to-br from-yellow-500/20 to-yellow-600/10">
                                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
                                    </div>
                                    Mistake Reported
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm pt-0">
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                                    <span className="font-medium text-muted-foreground">Type:</span>
                                    <Badge variant="outline" className="text-xs">
                                      {message.mistakeData.type.replace("_", " ")}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                                    <span className="font-medium text-muted-foreground">Severity:</span>
                                    <Badge
                                      variant={
                                        message.mistakeData.severity === "critical"
                                          ? "destructive"
                                          : message.mistakeData.severity === "high"
                                          ? "default"
                                          : "secondary"
                                      }
                                      className="text-xs"
                                    >
                                      {message.mistakeData.severity}
                                    </Badge>
                                  </div>
                                  <Separator className="my-2" />
                                  <div className="p-3 rounded-lg bg-muted/30">
                                    <span className="font-medium text-muted-foreground block mb-2">Description:</span>
                                    <p className="text-foreground">{message.mistakeData.description}</p>
                                  </div>
                                  {message.mistakeData.affectedAmount && (
                                    <>
                                      <Separator className="my-2" />
                                      <div className="flex justify-between items-center p-2 rounded-lg bg-muted/50">
                                        <span className="font-medium text-muted-foreground">Affected Amount:</span>
                                        <span className="font-bold">
                                          {formatCurrency(message.mistakeData.affectedAmount)}
                                        </span>
                                      </div>
                                    </>
                                  )}
                                </CardContent>
                              </Card>
                            )}

                            {/* Attachments */}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="space-y-2 mb-3">
                                {message.attachments.map((attachment) => (
                                  <div key={attachment.id}>
                                    {attachment.type === "image" ? (
                                      <div className="rounded-2xl overflow-hidden border-2 border-border/50 shadow-md">
                                        <img
                                          src={attachment.url}
                                          alt={attachment.name}
                                          className="max-w-full rounded-2xl max-h-64 sm:max-h-80 object-cover cursor-pointer hover:opacity-90 transition-opacity block"
                                          onClick={() => window.open(attachment.url, "_blank")}
                                        />
                                      </div>
                                    ) : (
                                      <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-4 bg-muted/70 rounded-xl border-2 border-border/50 hover:bg-muted hover:border-primary/30 transition-all group"
                                      >
                                        <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                                          <FileText className="h-5 w-5 text-primary" />
                                        </div>
                                        <span className="text-sm truncate flex-1 font-medium">{attachment.name}</span>
                                        <Download className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Message Content */}
                            {message.content && (
                              <p className="whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed">
                                {message.content}
                              </p>
                            )}

                            {/* Message Time & Status */}
                            <div
                              className={cn(
                                "flex items-center gap-2 mt-3",
                                isOwnMessage ? "justify-end" : "justify-start"
                              )}
                            >
                              <span className="text-[10px] sm:text-xs opacity-70">
                                {formatTime(message.createdAt)}
                              </span>
                              {isOwnMessage && (
                                <span className="opacity-70">
                                  {message.readBy && message.readBy.length > 1 ? (
                                    <CheckCheck className="h-3.5 w-3.5" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5" />
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Modern Floating Input Area - Fixed for Mobile */}
            <div className={cn(
              "border-t bg-card/95 backdrop-blur-md px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 flex-shrink-0 shadow-2xl",
              isMobile 
                ? "fixed bottom-16 left-0 right-0 z-40 pb-3" 
                : "pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
            )}>
              {selectedFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 sm:mb-4">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-2 sm:p-3 bg-muted/70 rounded-xl border-2 border-border/50 text-sm group"
                    >
                      {file.type.startsWith("image/") ? (
                        <ImageIcon className="h-4 w-4 text-primary flex-shrink-0" />
                      ) : (
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                      )}
                      <span className="truncate max-w-[120px] sm:max-w-[150px] md:max-w-[200px] font-medium">{file.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors flex-shrink-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 sm:gap-3 items-end">
                <div className="flex gap-1 sm:gap-1.5 flex-shrink-0">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => imageInputRef.current?.click()}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-full hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0"
                    title="Add image"
                  >
                    <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-full hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0"
                    title="Attach file"
                  >
                    <Paperclip className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleSendProfitUpdate}
                    title="Send today's profit update"
                    className="h-10 w-10 sm:h-11 sm:w-11 rounded-full hover:bg-primary/10 hover:text-primary transition-colors flex-shrink-0 hidden sm:flex"
                  >
                    <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                  <div className="hidden sm:block">
                    <MistakeReportDialog onReport={handleReportMistake} />
                  </div>
                </div>
                <div className="flex-1 relative min-w-0 max-w-full">
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
                    className="w-full min-h-[44px] sm:min-h-[52px] md:min-h-[56px] max-h-32 resize-none rounded-2xl pr-12 sm:pr-14 bg-background border-2 border-border/50 focus:border-primary/50 transition-all text-sm sm:text-base"
                    disabled={isUploading}
                    rows={1}
                    style={{ width: '100%', maxWidth: '100%' }}
                  />
                </div>
                <Button
                  onClick={handleSendMessage}
                  disabled={(!messageContent.trim() && selectedFiles.length === 0) || isUploading}
                  size="icon"
                  className="h-10 w-10 sm:h-11 sm:w-11 md:h-12 md:w-12 rounded-full flex-shrink-0 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 bg-gradient-to-br from-primary to-primary/90"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
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
          <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
            <div className="text-center px-4 max-w-lg">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/20 via-primary/10 to-background mb-8 shadow-lg">
                <MessageSquare className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-foreground">Welcome to Chat</h3>
              <p className="text-base sm:text-lg text-muted-foreground mb-8">
                Select a conversation from the sidebar or create a new group to start messaging
              </p>
              <Button 
                onClick={() => setIsCreatingGroup(true)} 
                size="lg"
                className="rounded-full px-8 shadow-lg hover:shadow-xl"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Your First Group
              </Button>
            </div>
          </div>
        )}
      </div>
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
        <Button 
          size="icon" 
          variant="ghost" 
          title="Report a mistake" 
          className="h-11 w-11 rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
        >
          <AlertTriangle className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a Mistake</DialogTitle>
          <DialogDescription>
            Report any mistakes or issues found in profit calculations or data
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Mistake Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="h-11">
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
          <div className="space-y-2">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
              <SelectTrigger className="h-11">
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
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the mistake..."
              rows={4}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label>Affected Amount (AUD)</Label>
            <Input
              type="number"
              value={affectedAmount}
              onChange={(e) => setAffectedAmount(e.target.value)}
              placeholder="0.00"
              className="h-11"
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
