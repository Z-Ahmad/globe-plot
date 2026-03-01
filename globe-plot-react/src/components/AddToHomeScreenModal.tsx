import { useMediaQuery } from "usehooks-ts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { usePWAInstall, type InstallPlatform } from "@/hooks/usePWAInstall";
import { Share2, MoreVertical, Monitor, ShareIcon, SquarePlusIcon } from "lucide-react";

interface AddToHomeScreenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function IOSInstructions() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Add Globeplot to your home screen for quick access and offline use. Follow these steps:</p>
      <ol className="space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">1</span>
          <div>
            <p className="font-medium text-foreground">Tap the Share button</p>
            <p className="text-muted-foreground mt-0.5">
              Look for the Share icon
              <ShareIcon className="inline-block mx-1.5 h-4 w-4 align-middle" />
              at the bottom of Safari (or in the top bar on iPad).
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">2</span>
          <div>
            <p className="font-medium text-foreground">
              Tap &quot;
              <SquarePlusIcon className="inline-block mx-1.5 h-4 w-4 align-middle" />
              Add to Home Screen&quot;
            </p>
            <p className="text-muted-foreground mt-0.5">Scroll down in the Share menu and tap this option.</p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">3</span>
          <div>
            <p className="font-medium text-foreground">Tap &quot;Add&quot;</p>
            <p className="text-muted-foreground mt-0.5">Confirm by tapping Add in the top right corner.</p>
          </div>
        </li>
      </ol>
    </div>
  );
}

function AndroidInstructions() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Add Globeplot to your home screen for quick access and offline use:
      </p>
      <ol className="space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            1
          </span>
          <div>
            <p className="font-medium text-foreground">Tap the menu</p>
            <p className="text-muted-foreground mt-0.5">
              Tap the three dots
              <MoreVertical className="inline-block mx-1.5 h-4 w-4 align-middle" />
              in the top right of Chrome.
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            2
          </span>
          <div>
            <p className="font-medium text-foreground">Tap &quot;Add to Home screen&quot; or &quot;Install app&quot;</p>
            <p className="text-muted-foreground mt-0.5">
              Select the option to install Globeplot on your device.
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}

function DesktopInstructions() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Install Globeplot as an app for quick access and offline use:
      </p>
      <ol className="space-y-4 text-sm">
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            1
          </span>
          <div>
            <p className="font-medium text-foreground">Look for the install icon</p>
            <p className="text-muted-foreground mt-0.5">
              In Chrome or Edge, look for a
              <Monitor className="inline-block mx-1.5 h-4 w-4 align-middle" />
              install icon in the address bar (or the plus icon in some browsers).
            </p>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
            2
          </span>
          <div>
            <p className="font-medium text-foreground">Or use the browser menu</p>
            <p className="text-muted-foreground mt-0.5">
              Click the three dots
              <MoreVertical className="inline-block mx-1.5 h-4 w-4 align-middle" />
              → &quot;Install Globeplot&quot; or &quot;Apps&quot; → &quot;Install this site as an app&quot;.
            </p>
          </div>
        </li>
      </ol>
    </div>
  );
}

function PlatformInstructions({ platform }: { platform: InstallPlatform }) {
  if (platform === "ios") return <IOSInstructions />;
  if (platform === "android") return <AndroidInstructions />;
  return <DesktopInstructions />;
}

export function AddToHomeScreenModal({ open, onOpenChange }: AddToHomeScreenModalProps) {
  const { platform, isStandalone } = usePWAInstall();
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const effectivePlatform = platform ?? "desktop";

  if (isStandalone) return null;

  const content = <PlatformInstructions platform={effectivePlatform} />;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add Globeplot to Home Screen</DialogTitle>
            <DialogDescription>
              Get a native app experience with offline access
            </DialogDescription>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4 pb-6 max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle>Add Globeplot to Home Screen</DrawerTitle>
          <DrawerDescription>
            Get a native app experience with offline access
          </DrawerDescription>
        </DrawerHeader>
        <div className="overflow-y-auto px-1">{content}</div>
      </DrawerContent>
    </Drawer>
  );
}
