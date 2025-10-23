import { LanguageButton } from "@/_demo/lang-button";
import RightTop from "@/_demo/right-top";
// import { Alert, AlertDescription } from "@/ui/shadcn/components/ui/alert";
// import { InfoCircledIcon } from "@radix-ui/react-icons";

const Logo = () => {
  return (
    <div className="flex w-96 items-center gap-2">
      <a href="https://chaibuilder.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
        <img src="/chaibuilder-logo.png" alt="Chai Builder" width={32} height={32} className="rounded-md" />
        <span className="text-2xl font-bold tracking-tight">Chai Builder</span>
      </a>

      <a href="https://github.com/chaibuilder/sdk" target="_blank" rel="noopener noreferrer">
        <img src="https://img.shields.io/github/stars/chaibuilder/sdk" alt="Chai Builder" className="rounded-md" />
      </a>
    </div>
  );
};

// const DemoAlert = () => {
//   return (
//     <Alert variant="default" className="border-b border-border px-4 py-2">
//       <AlertDescription className="flex items-center gap-2">
//         <InfoCircledIcon className="h-4 w-4" />
//         <span className="font-bold">Demo mode</span> - Changes are saved in your browser local storage. AI actions are
//         mocked.
//       </AlertDescription>
//     </Alert>
//   );
// };

export default function Topbar() {
  return (
    <div className="flex w-full items-center justify-between px-2">
      <Logo />
      <span>{/* <DemoAlert /> */}</span>
      <div className="flex items-center gap-2">
        <LanguageButton />
        <RightTop />
      </div>
    </div>
  );
}
