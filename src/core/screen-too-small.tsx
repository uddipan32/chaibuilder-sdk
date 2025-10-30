export const ScreenTooSmall = () => {
  return (
    <section className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-white bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)] bg-[size:10px_10px] py-12 sm:py-16 md:hidden lg:hidden lg:py-20 xl:hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-md space-y-6 text-center">
          <img
            src="https://ucarecdn.com/fbfc3b05-cb73-4e99-92a2-3a367b7c36cd/"
            alt="Chai Builder"
            className="mx-auto h-20 w-20 rounded-full shadow-lg transition-transform duration-300 hover:scale-105"
          />
          <div className="space-y-4">
            <h2 className="text-5xl font-bold tracking-tight text-gray-900">Screen too small</h2>
            <p className="mx-auto max-w-sm text-sm leading-7 text-gray-600">
              Please view this page on greater than <strong className="font-medium">1280px</strong> screen width for the
              best experience.
            </p>
          </div>
          <div className="pt-4">
            <div className="inline-flex items-center rounded-full bg-gray-100 px-4 py-2 text-sm text-gray-700">
              <svg className="mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Minimum width: 1280px
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
