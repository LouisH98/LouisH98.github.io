import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { X, ArrowRight, ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  url: string;
  layoutId?: string;
  children?: React.ReactNode;
  markdownContent?: string;
}

export function Modal({ isOpen, onClose, title, url, layoutId, children, markdownContent }: ModalProps) {
  const modalRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [showScrollIndicator, setShowScrollIndicator] = React.useState(false);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  React.useEffect(() => {
    const checkScrollIndicator = () => {
      if (contentRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        const isAtTop = scrollTop === 0;
        const hasScrollableContent = scrollHeight > clientHeight;
        setShowScrollIndicator(isAtTop && hasScrollableContent);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement && isOpen) {
      checkScrollIndicator();
      contentElement.addEventListener('scroll', checkScrollIndicator);
      
      return () => {
        contentElement.removeEventListener('scroll', checkScrollIndicator);
      };
    }
  }, [isOpen, markdownContent]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleBackdropClick}
          />
          
          <motion.div
            ref={modalRef}
            layoutId={layoutId}
            style={{
              backdropFilter: "blur(40px)",
            }}
            className={cn(
              "absolute inset-16 z-10 bg-black/20 rounded-lg shadow-xl border overflow-hidden max-w-[1000px] mx-auto"
            )}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
              mass: 0.8,
            }}
          >
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-6 border-b flex-shrink-0">
              <div className="flex items-center gap-4">
                <motion.h2 
                  layoutId={layoutId ? `project-title-${title}` : undefined}
                  className="text-xl font-semibold"
                >
                  {title}
                </motion.h2>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-2 text-base text-white hover:text-gray-200 transition-colors"
                >
                  View Project
                  <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
                </a>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-md transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="relative flex-1 min-h-0">
              <AnimatePresence>
                {showScrollIndicator && (
                  <motion.div
                    className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10 bg-black/50 backdrop-blur-sm rounded-full p-2 pointer-events-none"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <motion.div
                      animate={{ y: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <ChevronDown size={20} className="text-white" />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              <motion.div 
                ref={contentRef}
                className="p-6 overflow-y-auto h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
              {markdownContent ? (
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdownContent}
                  </ReactMarkdown>
                </div>
              ) : children || (
                <div className="text-gray-500 text-center py-8">
                  Content coming soon...
                </div>
              )}
              </motion.div>
            </div>
          </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}