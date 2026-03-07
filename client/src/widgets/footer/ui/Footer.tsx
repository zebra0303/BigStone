export function Footer() {
  return (
    <footer className="mt-12 pb-6 flex justify-end px-4 md:px-8">
      <a
        href="https://github.com/zebra0303/BigStone"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
      >
        <img src="/stone.png" alt="BigXi" className="w-5 h-5 object-contain" />
        <span>Powered by Big Stone Task Manager</span>
      </a>
    </footer>
  );
}
