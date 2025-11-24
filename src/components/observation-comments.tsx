"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Send, RefreshCw, Paperclip, File as FileIcon, X } from "lucide-react";
import { toast } from "sonner";
import { addCommentAction, getCommentsAction } from "@/actions/observation-comment.action";
import { uploadEvidenceAction } from "@/actions/upload-evidence.action";
import { formatDistanceToNow } from "date-fns";

interface Comment {
    id: string;
    message: string;
    createdAt: string;
    attachmentPath?: string | null;
    attachmentName?: string | null;
    user: {
        name: string;
        role: string;
    };
}

interface ObservationCommentsProps {
    observationId: string;
    currentUserRole: string;
    initialCommentCount: number;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export function ObservationComments({ observationId, currentUserRole, initialCommentCount }: ObservationCommentsProps) {
    const [comments, setComments] = useState<Comment[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [isLoading, setIsLoading] = useState(initialCommentCount > 0);
    const [isSending, setIsSending] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const fetchComments = async (showLoading = true) => {
        if (showLoading) setIsRefreshing(true);
        const result = await getCommentsAction(observationId);
        if (result.success && result.comments) {
            setComments(result.comments);
        } else {
            toast.error("Failed to load comments.");
        }
        setIsLoading(false);
        setIsRefreshing(false);
    };

    useEffect(() => {
        if (initialCommentCount > 0) {
            fetchComments(false);
        } else {
            setIsLoading(false);
        }
        // Removed polling to prevent continuous requests
    }, [observationId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [comments]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE_BYTES) {
                toast.error("File is too large. Max size is 5MB.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() && !selectedFile) return;

        setIsSending(true);
        let attachmentPath: string | undefined;
        let attachmentName: string | undefined;

        if (selectedFile) {
            const formData = new FormData();
            formData.append("evidenceFile", selectedFile);
            const uploadResult = await uploadEvidenceAction(formData);

            if (uploadResult.error) {
                toast.error(uploadResult.error);
                setIsSending(false);
                return;
            }
            attachmentPath = uploadResult.url;
            attachmentName = selectedFile.name;
        }

        const result = await addCommentAction(observationId, newMessage, attachmentPath, attachmentName);

        if (result.success && result.comment) {
            setComments((prev) => [...prev, result.comment]);
            setNewMessage("");
            setSelectedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } else {
            toast.error(result.error || "Failed to send message.");
        }
        setIsSending(false);
    };

    return (
        <div className="flex flex-col h-[400px] border rounded-md">
            <div className="p-3 border-b bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                <h4 className="text-sm font-semibold">Discussion History</h4>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => fetchComments(true)}
                    disabled={isRefreshing || isLoading}
                    title="Refresh comments"
                >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
                {isLoading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    </div>
                ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 text-sm">
                        <p>No messages yet.</p>
                        <p>Start the conversation below.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {comments.map((comment) => {
                            const isAgency = comment.user.role === "USER";
                            const alignRight = (currentUserRole === "USER" && isAgency) || (currentUserRole !== "USER" && !isAgency);

                            return (
                                <div key={comment.id} className={`flex gap-3 ${alignRight ? "flex-row-reverse" : "flex-row"}`}>
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback className={isAgency ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"}>
                                            {comment.user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className={`flex flex-col max-w-[80%] ${alignRight ? "items-end" : "items-start"}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-gray-600">
                                                {comment.user.name} ({isAgency ? "Agency" : "Admin"})
                                            </span>
                                            <span className="text-[10px] text-gray-400">
                                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <div className={`p-3 rounded-lg text-sm ${alignRight
                                                ? "bg-blue-600 text-white rounded-tr-none"
                                                : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-none"
                                            }`}>
                                            {comment.message && <p>{comment.message}</p>}
                                            {comment.attachmentPath && (
                                                <a
                                                    href={comment.attachmentPath}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={`flex items-center gap-2 mt-2 p-2 rounded bg-white/20 hover:bg-white/30 transition-colors text-xs ${alignRight ? "text-white" : "text-blue-600"}`}
                                                >
                                                    <Paperclip className="h-3 w-3" />
                                                    <span className="truncate max-w-[150px]">{comment.attachmentName || "Attachment"}</span>
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={scrollRef} />
                    </div>
                )}
            </ScrollArea>

            <div className="p-3 border-t bg-white dark:bg-gray-900">
                {selectedFile && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                        <FileIcon className="h-3 w-3" />
                        <span className="truncate flex-1">{selectedFile.name}</span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-4 w-4"
                            onClick={() => {
                                setSelectedFile(null);
                                if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                        >
                            <X className="h-3 w-3" />
                        </Button>
                    </div>
                )}
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileSelect}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        title="Attach file (max 5MB)"
                    >
                        <Paperclip className="h-4 w-4" />
                    </Button>
                    <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="min-h-[40px] max-h-[100px] resize-none"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                    />
                    <Button
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !selectedFile) || isSending}
                        className="h-10 w-10 shrink-0"
                    >
                        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
