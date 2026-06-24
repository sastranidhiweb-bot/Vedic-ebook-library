import { useEffect } from 'react';

const SITE_NAME = 'वेदिक ग्रंथालय - Vedic Library';

/**
 * Sets the document <title> and <meta name="description"> for the current route.
 * Restores nothing on unmount — the next route that mounts sets its own values.
 */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${SITE_NAME}` : SITE_NAME;

    if (description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', description);
    }
  }, [title, description]);
}
