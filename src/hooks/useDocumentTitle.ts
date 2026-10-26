import { useEffect } from "react";

const APP_NAME = "AI Voice Receptionist";

/** Keeps the browser tab title in sync with the page being viewed. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
