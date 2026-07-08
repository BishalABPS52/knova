'use client';

interface Comment {
  author: string;
  text: string;
  avatar?: string;
}

interface CardHeaderProps {
  author: string;
  avatar: string;
  timeAgo: string;
  category: string;
  isMobile?: boolean;
}

interface EngagementBarProps {
  likes: number;
  dislikes: number;
  commentsCount: number;
  onToggleComments: () => void;
  isCommentsExpanded: boolean;
  onShare: () => void;
  id: string | number;
  isMobile?: boolean;
}

interface CommentsSectionProps {
  comments: Comment[];
  isExpanded: boolean;
  onToggleComments: () => void;
  isMobile?: boolean;
}

export function CardHeader({ author, avatar, timeAgo, category, isMobile = false }: CardHeaderProps) {
  if (isMobile) {
    return (
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-orange-tint flex items-center justify-center overflow-hidden border border-primary/10">
          {typeof avatar === 'string' && avatar.length <= 2 ? (
            <span className="material-symbols-outlined text-primary">{avatar}</span>
          ) : (
            <img className="w-full h-full object-cover" src={avatar as string} alt="Author" />
          )}
        </div>
        <div>
          <p className="font-label-lg text-on-surface">{author}</p>
          <p className="text-label-md text-on-surface-variant">
            {timeAgo} • {category}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 border-b border-surface-variant flex justify-between items-center bg-surface-container-lowest">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-tertiary-container flex items-center justify-center text-white font-bold text-xs">
          {typeof avatar === 'string' && avatar.length <= 2 ? avatar : 'U'}
        </div>
        <div>
          <p className="font-label-sm text-label-sm text-on-surface">{author}</p>
          <p className="text-xs text-outline">{timeAgo}</p>
        </div>
      </div>
      <button className="material-symbols-outlined text-outline">more_horiz</button>
    </div>
  );
}

export function EngagementBar({ 
  likes, 
  dislikes, 
  commentsCount, 
  onToggleComments, 
  isCommentsExpanded, 
  onShare, 
  id, 
  isMobile = false 
}: EngagementBarProps) {
  if (isMobile) {
    const formatCount = (num: number) => {
      if (num >= 1000) return `${(num/1000).toFixed(1)}k`;
      return num;
    };

    return (
      <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-surface-container-low rounded-full px-3 py-1.5 gap-3">
            <div className="flex items-center gap-1">
              <button 
                className="material-symbols-outlined text-primary text-[20px] active:scale-90 transition-transform" 
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                arrow_upward
              </button>
              <span className="font-label-md text-on-surface">{formatCount(likes)}</span>
            </div>
            <div className="flex items-center gap-1">
              <button className="material-symbols-outlined text-on-surface-variant text-[20px] active:scale-90 transition-transform">
                arrow_downward
              </button>
              <span className="font-label-md text-on-surface-variant">{dislikes}</span>
            </div>
          </div>
          <button 
            className={`flex items-center gap-1.5 ${isCommentsExpanded ? 'text-primary' : 'text-on-surface-variant'}`}
            onClick={onToggleComments}
          >
            <span className="material-symbols-outlined text-[20px]">chat_bubble</span>
            <span className="font-label-md">{commentsCount}</span>
          </button>
        </div>
        <button 
          className="material-symbols-outlined text-on-surface-variant" 
          onClick={onShare}
        >
          share
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-surface-variant flex justify-between items-center bg-surface-container-lowest">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-1 bg-surface-container px-3 py-1.5 rounded-full">
          <button className="material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors text-primary">
            arrow_upward
          </button>
          <span className="font-bold text-sm">{likes}</span>
          <div className="w-px h-3 bg-outline-variant mx-1"></div>
          <button className="material-symbols-outlined text-on-surface-variant hover:text-error transition-colors">
            arrow_downward
          </button>
          <span className="font-bold text-sm">{dislikes}</span>
        </div>
        <button
          className={`flex items-center gap-2 ${isCommentsExpanded ? 'text-primary' : 'text-on-surface-variant'} hover:text-primary transition-colors py-2 px-3 rounded-lg hover:bg-surface-container text-secondary`}
          onClick={onToggleComments}
        >
          <span className="material-symbols-outlined">forum</span>
          <span className="font-medium text-sm">{commentsCount}</span>
        </button>
      </div>
      <div className="flex gap-2">
        <button
          className="material-symbols-outlined text-outline p-2 hover:bg-surface-container rounded-full transition-colors text-primary"
          onClick={onShare}
        >
          share
        </button>
      </div>
    </div>
  );
}

export function CommentsSection({ comments, isExpanded, onToggleComments, isMobile = false }: CommentsSectionProps) {
  if (isMobile) {
    return (
      <div className={`comment-section ${isExpanded ? 'expanded' : ''}`}>
        <div className="space-y-4 mb-4">
          {comments.length > 0 ? (
            comments.map((comment, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-tint flex-shrink-0"></div>
                <div className="bg-surface-container-low rounded-xl px-3 py-2 flex-1">
                  <p className="font-label-md text-on-surface">{comment.author}</p>
                  <p className="text-body-sm text-on-surface-variant">{comment.text}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-outline italic text-center py-4">
              No comments yet. Be the first to share your thoughts!
            </p>
          )}
        </div>
        <div className="flex gap-2 items-center border-t border-border-subtle/30 pt-3">
          <input
            className="flex-1 bg-surface-container-low border-none rounded-lg px-3 py-2 text-body-sm focus:ring-1 focus:ring-primary/30"
            placeholder="Write a comment..."
            type="text"
          />
          <button className="text-primary font-label-lg px-2">Post</button>
        </div>
        <div className="flex justify-center mt-4 pb-2">
          <button
            className="text-secondary font-label-lg flex items-center gap-1"
            onClick={onToggleComments}
          >
            <span className="material-symbols-outlined text-[18px]">expand_less</span>
            Hide comments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`comments-section p-6 border-t border-surface-variant bg-surface-container-lowest ${isExpanded ? 'active' : ''}`}>
      <div className="space-y-6">
        <div className="space-y-4">
          {comments.length > 0 ? (
            comments.map((comment, index) => (
              <div key={index} className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary-fixed flex-shrink-0 flex items-center justify-center text-xs font-bold text-on-secondary-fixed">
                  {comment.avatar || comment.author.substring(0, 2).toUpperCase()}
                </div>
                <div className="bg-surface-container p-3 rounded-2xl flex-1">
                  <p className="font-bold text-xs mb-1">{comment.author}</p>
                  <p className="text-sm">{comment.text}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="space-y-4 empty-state text-center py-4">
              <p className="text-xs text-outline italic">No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 pt-4 border-t border-surface-variant/30">
          <div className="w-8 h-8 rounded-full bg-secondary-container flex-shrink-0 overflow-hidden">
            <div className="w-full h-full bg-primary flex items-center justify-center text-white font-bold text-xs">U</div>
          </div>
          <div className="flex-1 flex gap-2">
            <input
              className="bg-surface-container border-none focus:ring-1 focus:ring-primary rounded-xl px-4 py-2 text-sm flex-1"
              placeholder="Add a comment..."
            />
            <button className="bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-on-primary-fixed-variant transition-colors">
              Post
            </button>
          </div>
        </div>
        <button
          className="w-full text-center text-xs font-bold pt-2 transition-colors text-secondary hover:text-on-secondary-fixed-variant"
          onClick={onToggleComments}
        >
          Hide comments
        </button>
      </div>
    </div>
  );
}