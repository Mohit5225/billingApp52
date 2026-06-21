"use client";

import { useEffect, useRef, ReactNode } from "react";

interface AdaptiveTextProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export default function AdaptiveText({ children, className = "", title }: AdaptiveTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    const updateScale = () => {
      text.style.transform = "none";
      const containerWidth = container.clientWidth;
      const textWidth = text.scrollWidth;

      if (textWidth > containerWidth && containerWidth > 0) {
        const scale = (containerWidth - 2) / textWidth;
        text.style.transform = `scale(${scale})`;
      }
    };

    const resizeObserver = new ResizeObserver(() => updateScale());
    resizeObserver.observe(container);
    updateScale();

    return () => resizeObserver.disconnect();
  }, [children]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden flex items-center min-w-0">
      <p 
        ref={textRef}
        className={`whitespace-nowrap origin-left inline-block ${className}`}
        title={title}
      >
        {children}
      </p>
    </div>
  );
}
