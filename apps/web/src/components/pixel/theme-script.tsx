/**
 * Runs before React hydrates so html[data-theme] matches localStorage and day
 * users avoid a flash of night mode. React still hydrates with DEFAULT_NIGHT;
 * useEffect in InvertProvider reconciles on the client after mount.
 */
export function ThemeScript() {
  const script = `(function(){try{var s=localStorage.getItem('aisounds-invert');var n=s===null||s==='night';document.documentElement.dataset.theme=n?'night':'day';}catch(e){document.documentElement.dataset.theme='night';}})();`

  return <script dangerouslySetInnerHTML={{ __html: script }} />
}
