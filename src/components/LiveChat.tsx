import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  MessageSquare,
  HelpCircle,
  Pin,
  Trash2,
  CheckCircle,
  Sparkles,
  ShieldAlert,
  Flame,
  ThumbsUp,
  Heart,
  Smile,
  User
} from 'lucide-react';
import { LiveComment, LiveQuestion, StreamSettings, ReactionType } from '../types.ts';
import { realtimeSocket } from '../lib/socket.ts';

interface LiveChatProps {
  comments: LiveComment[];
  questions: LiveQuestion[];
  reactions: Record<string, number>;
  settings: StreamSettings;
  viewerId: string;
  viewerName: string;
  setViewerName: (name: string) => void;
  isAdmin?: boolean;
  onSendReaction: (type: ReactionType) => void;
  onDeleteComment?: (id: string) => void;
  onPinComment?: (id: string, isPinned: boolean) => void;
  onHighlightQuestion?: (id: string, isHighlighted: boolean) => void;
  onAnswerQuestion?: (id: string, isAnswered: boolean) => void;
  onBlockViewer?: (viewerId: string, viewerName: string) => void;
}

const REACTION_BUTTONS: { type: ReactionType; label: string; emoji: string }[] = [
  { type: 'heart', label: 'Love', emoji: '❤️' },
  { type: 'fire', label: 'Fire', emoji: '🔥' },
  { type: 'clap', label: 'Clap', emoji: '👏' },
  { type: 'laugh', label: 'Laugh', emoji: '😂' },
  { type: 'hearteyes', label: 'Heart Eyes', emoji: '😍' },
  { type: 'thumbsup', label: 'Like', emoji: '👍' }
];

export const LiveChat: React.FC<LiveChatProps> = ({
  comments,
  questions,
  reactions,
  settings,
  viewerId,
  viewerName,
  setViewerName,
  isAdmin = false,
  onSendReaction,
  onDeleteComment,
  onPinComment,
  onHighlightQuestion,
  onAnswerQuestion,
  onBlockViewer
}) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'questions'>('chat');
  const [inputText, setInputText] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(viewerName);
  const [chatError, setChatError] = useState<string | null>(null);

  const commentsEndRef = useRef<HTMLDivElement>(null);
  const questionsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (activeTab === 'chat') {
      commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, activeTab]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setChatError(null);

    if (activeTab === 'chat') {
      if (!settings.chatEnabled) {
        setChatError('Live chat is disabled by the administrator.');
        return;
      }
      realtimeSocket.send('chat:send', {
        viewerId,
        viewerName,
        message: inputText.trim()
      });
    } else {
      if (!settings.questionsEnabled) {
        setChatError('Questions are disabled by the administrator.');
        return;
      }
      realtimeSocket.send('question:ask', {
        viewerId,
        viewerName,
        question: inputText.trim()
      });
    }

    setInputText('');
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      setViewerName(tempName.trim());
      setIsEditingName(false);
    }
  };

  // Pinned comment if any
  const pinnedComment = comments.find((c) => c.isPinned && !c.isDeleted);
  // Highlighted question if any
  const highlightedQuestion = questions.find((q) => q.isHighlighted);

  return (
    <div className="flex flex-col h-full bg-[#121215] border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header Tabs & User Name Badge */}
      <div className="p-3 bg-zinc-900/90 border-b border-zinc-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-zinc-950/80 rounded-lg border border-zinc-800/80">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Live Chat</span>
            <span className="text-[10px] text-zinc-500 tabular-nums">({comments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('questions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              activeTab === 'questions'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Questions</span>
            <span className="text-[10px] text-zinc-500 tabular-nums">({questions.length})</span>
          </button>
        </div>

        {/* Viewer Identity Selector */}
        {!isAdmin && (
          <div className="flex items-center text-xs">
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-1">
                <input
                  type="text"
                  maxLength={24}
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  className="w-24 px-2 py-0.5 bg-black border border-zinc-700 rounded text-xs text-white focus:outline-none focus:border-rose-500"
                  placeholder="Your Name"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-2 py-0.5 bg-rose-600 text-white text-[11px] font-semibold rounded hover:bg-rose-500"
                >
                  OK
                </button>
              </form>
            ) : (
              <button
                onClick={() => {
                  setTempName(viewerName);
                  setIsEditingName(true);
                }}
                className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-200 transition-colors py-1 px-2 rounded hover:bg-zinc-800"
                title="Click to edit your display name"
              >
                <User className="w-3 h-3 text-rose-400" />
                <span className="max-w-[100px] truncate">{viewerName}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Pinned Message Banner */}
      {pinnedComment && activeTab === 'chat' && (
        <div className="px-3 py-2 bg-rose-950/40 border-b border-rose-900/40 flex items-start justify-between gap-2 text-xs">
          <div className="flex items-start gap-2">
            <Pin className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-300">{pinnedComment.viewerName}: </span>
              <span className="text-zinc-200">{pinnedComment.message}</span>
            </div>
          </div>
          {isAdmin && onPinComment && (
            <button
              onClick={() => onPinComment(pinnedComment.id, false)}
              className="text-zinc-400 hover:text-zinc-200 text-[10px] shrink-0"
              title="Unpin message"
            >
              Unpin
            </button>
          )}
        </div>
      )}

      {/* Highlighted Question Banner */}
      {highlightedQuestion && (
        <div className="px-3 py-2.5 bg-gradient-to-r from-amber-950/60 via-zinc-900 to-zinc-900 border-b border-amber-900/40 flex items-start justify-between gap-2 text-xs">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                Broadcaster Q&A Spotlight
              </div>
              <div className="text-white font-medium mt-0.5">{highlightedQuestion.question}</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">— Asked by {highlightedQuestion.viewerName}</div>
            </div>
          </div>
          {isAdmin && onHighlightQuestion && (
            <button
              onClick={() => onHighlightQuestion(highlightedQuestion.id, false)}
              className="text-zinc-400 hover:text-zinc-200 text-[10px] shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* Main Content Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[260px] sm:min-h-[340px]">
        {activeTab === 'chat' ? (
          comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40 text-zinc-400" />
              <p className="text-sm font-medium text-zinc-400">No chat messages yet</p>
              <p className="text-xs text-zinc-500 mt-1">Be the first to say hello to Bilal Rao!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div
                key={c.id}
                className="group relative flex items-start justify-between gap-2 text-xs hover:bg-zinc-800/30 p-1.5 rounded-lg transition-colors"
              >
                <div className="space-y-0.5 break-words max-w-[85%]">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-semibold text-zinc-300">
                      {c.viewerName}
                    </span>
                    {c.viewerName.toLowerCase().includes('bilal') && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                        HOST
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 tabular-nums">
                      {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-zinc-200 text-sm leading-relaxed">{c.message}</p>
                </div>

                {/* Admin Moderation Actions */}
                {isAdmin && (
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
                    {onPinComment && (
                      <button
                        onClick={() => onPinComment(c.id, !c.isPinned)}
                        className={`p-1 rounded hover:bg-zinc-700 ${c.isPinned ? 'text-rose-400' : 'text-zinc-400'}`}
                        title={c.isPinned ? 'Unpin' : 'Pin to top'}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                    )}
                    {onDeleteComment && (
                      <button
                        onClick={() => onDeleteComment(c.id)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-700"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {onBlockViewer && (
                      <button
                        onClick={() => onBlockViewer(c.viewerId, c.viewerName)}
                        className="p-1 rounded text-zinc-400 hover:text-rose-500 hover:bg-zinc-700"
                        title="Block viewer"
                      >
                        <ShieldAlert className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )
        ) : (
          questions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <HelpCircle className="w-8 h-8 mb-2 opacity-40 text-rose-400" />
              <p className="text-sm font-medium text-zinc-400">No questions asked yet</p>
              <p className="text-xs text-zinc-500 mt-1">Ask Bilal Rao anything about tech, career, or broadcasting.</p>
            </div>
          ) : (
            questions.map((q) => (
              <div
                key={q.id}
                className={`p-2.5 rounded-xl border text-xs transition-all space-y-1.5 ${
                  q.isHighlighted
                    ? 'bg-amber-950/30 border-amber-800/70'
                    : q.isAnswered
                    ? 'bg-zinc-900/40 border-zinc-800/50 opacity-60'
                    : 'bg-zinc-900/80 border-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-300">{q.viewerName}</span>
                  <div className="flex items-center gap-1">
                    {q.isAnswered && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Answered
                      </span>
                    )}
                    <span className="text-[10px] text-zinc-500 tabular-nums">
                      {new Date(q.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>

                <p className="text-zinc-100 text-sm font-medium leading-snug">{q.question}</p>

                {/* Admin controls for question */}
                {isAdmin && (
                  <div className="pt-1 flex items-center justify-end gap-2 border-t border-zinc-800/60">
                    {onHighlightQuestion && (
                      <button
                        onClick={() => onHighlightQuestion(q.id, !q.isHighlighted)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          q.isHighlighted
                            ? 'bg-amber-500 text-black'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {q.isHighlighted ? 'Highlighted' : 'Highlight on Stream'}
                      </button>
                    )}
                    {onAnswerQuestion && (
                      <button
                        onClick={() => onAnswerQuestion(q.id, !q.isAnswered)}
                        className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                          q.isAnswered
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {q.isAnswered ? 'Mark Unanswered' : 'Mark Answered'}
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))
          )
        )}
        <div ref={activeTab === 'chat' ? commentsEndRef : questionsEndRef} />
      </div>

      {/* Floating Reaction Bar */}
      <div className="px-3 py-2 bg-zinc-950/90 border-t border-zinc-800 flex items-center justify-between gap-1 overflow-x-auto">
        {REACTION_BUTTONS.map((rb) => (
          <button
            key={rb.type}
            onClick={() => onSendReaction(rb.type)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:scale-90 border border-zinc-800/80 text-xs text-white transition-all cursor-pointer shrink-0"
            title={`Send ${rb.label}`}
          >
            <span className="text-base">{rb.emoji}</span>
            <span className="text-[11px] font-mono text-zinc-400 tabular-nums">
              {reactions[rb.type] || 0}
            </span>
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <div className="p-3 bg-zinc-900 border-t border-zinc-800">
        {chatError && (
          <p className="text-xs text-rose-400 mb-2 font-medium">{chatError}</p>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            maxLength={activeTab === 'chat' ? settings.maxMessageLength : 300}
            placeholder={
              activeTab === 'chat'
                ? settings.chatEnabled
                  ? 'Send a live comment...'
                  : 'Chat is currently disabled'
                : settings.questionsEnabled
                ? 'Ask Bilal a question...'
                : 'Questions are currently disabled'
            }
            disabled={activeTab === 'chat' ? !settings.chatEnabled : !settings.questionsEnabled}
            className="flex-1 bg-black/70 border border-zinc-800 focus:border-rose-500 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none transition-colors"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:hover:bg-rose-600 text-white font-medium text-xs flex items-center justify-center transition-colors shrink-0"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1.5 px-1">
          <span>{activeTab === 'chat' ? 'Live public chat' : 'Q&A feed for Bilal'}</span>
          <span>{inputText.length} / {activeTab === 'chat' ? settings.maxMessageLength : 300}</span>
        </div>
      </div>
    </div>
  );
};
