'use client';

import { useState, memo, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession, signOut } from '@/lib/auth-client';
import { toast } from 'sonner';
import {
  SignOutIcon,
  SignInIcon,
  EyeIcon,
  EyeSlashIcon,
  InfoIcon,
  FileTextIcon,
  ShieldIcon,
  GithubLogoIcon,
  BugIcon,
  SunIcon,
  GearIcon,
  CodeIcon,
  BookIcon,
  XLogoIcon,
  InstagramLogoIcon,
} from '@phosphor-icons/react';
import { HugeiconsIcon } from '@hugeicons/react';
import { BinocularsIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { ThemeSwitcher } from './theme-switcher';
import { useRouter } from 'next/navigation';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';
import { User } from '@/lib/db/schema';
import { SettingsDialog } from './settings-dialog';
import { SettingsIcon, type SettingsIconHandle } from '@/components/ui/settings';
import { SignInPromptDialog } from '@/components/sign-in-prompt-dialog';
import { MonitorIcon, MoonStarIcon } from 'lucide-react';
import { useTheme } from 'next-themes';

const VercelIcon = ({ size = 16 }: { size: number }) => {
  return (
    <svg height={size} strokeLinejoin="round" viewBox="0 0 16 16" width={size} style={{ color: 'currentcolor' }}>
      <path fillRule="evenodd" clipRule="evenodd" d="M8 1L16 15H0L8 1Z" fill="currentColor"></path>
    </svg>
  );
};

// Navigation Menu Component has been merged into UserProfile

// User Profile Component - merged with navigation menu
const UserProfile = memo(
  ({
    className,
    user,
    subscriptionData,
    isProUser,
    isProStatusLoading,
    isCustomInstructionsEnabled,
    setIsCustomInstructionsEnabled,
    settingsOpen,
    setSettingsOpen,
    settingsInitialTab,
  }: {
    className?: string;
    user?: User | null;
    subscriptionData?: any;
    isProUser?: boolean;
    isProStatusLoading?: boolean;
    isCustomInstructionsEnabled?: boolean;
    setIsCustomInstructionsEnabled?: (value: boolean | ((val: boolean) => boolean)) => void;
    settingsOpen?: boolean;
    setSettingsOpen?: (open: boolean) => void;
    settingsInitialTab?: string;
  }) => {
    const [signingOut, setSigningOut] = useState(false);
    const [signingIn, setSigningIn] = useState(false);
    const [signInDialogOpen, setSignInDialogOpen] = useState(false);
    const [showEmail, setShowEmail] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [blurPersonalInfo] = useLocalStorage<boolean>('scira-blur-personal-info', false);
    const { data: session, isPending } = useSession();
    const router = useRouter();
    const settingsIconRef = useRef<SettingsIconHandle>(null);

    // Use passed user prop if available, otherwise fall back to session
    // BUT only use session for authentication check, not for settings dialog data
    const currentUser = user || session?.user;
    const isAuthenticated = !!(user || session);

    // For settings dialog, always use the passed user prop (has unified data structure)
    const settingsUser = user;

    // Use passed Pro status instead of calculating it
    const hasActiveSubscription = isProUser;

    // Control the animation based on dropdown state
    useEffect(() => {
      if (isOpen) {
        settingsIconRef.current?.startAnimation();
      } else {
        settingsIconRef.current?.stopAnimation();
      }
    }, [isOpen]);

    if (isPending && !user) {
      return (
        <div className="h-8 w-8 flex items-center justify-center">
          <div className="size-4 rounded-full bg-muted/50 animate-pulse"></div>
        </div>
      );
    }

    // Function to format email for display
    const formatEmail = (email?: string | null) => {
      if (!email) return '';

      // If showing full email, don't truncate it
      if (showEmail) {
        return email;
      }

      // If hiding email, show only first few characters and domain
      const parts = email.split('@');
      if (parts.length === 2) {
        const username = parts[0];
        const domain = parts[1];
        const maskedUsername = username.slice(0, 3) + '•••';
        return `${maskedUsername}@${domain}`;
      }

      // Fallback for unusual email formats
      return email.slice(0, 3) + '•••';
    };

    return (
      <>
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                {isAuthenticated ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn('!p-0 !m-0', signingOut && 'animate-pulse', className)}
                    asChild
                  >
                    <Avatar className="size-6 rounded-full border border-neutral-200 dark:border-neutral-700 !p-0 !m-0">
                      <AvatarImage
                        src={currentUser?.image ?? ''}
                        alt={currentUser?.name ?? ''}
                        className="rounded-md !p-0 !m-0 size-6"
                      />
                      <AvatarFallback className="rounded-md text-sm !p-0 !m-0 size-6">
                        {currentUser?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                ) : (
                  <div className="flex items-center justify-center hover:bg-accent hover:text-accent-foreground rounded-md transition-colors cursor-pointer !size-6 !p-0 !m-0">
                    <SettingsIcon ref={settingsIconRef} size={18} />
                  </div>
                )}
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" sideOffset={4}>
              {isAuthenticated ? 'Account' : 'Menu'}
            </TooltipContent>
          </Tooltip>
          <DropdownMenuContent className="w-[240px] z-[110] mr-5">
            {/* User info section - only show if authenticated */}
            {isAuthenticated && (
              <>
                <div className="p-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8 shrink-0 rounded-md border border-neutral-200 dark:border-neutral-700">
                      <AvatarImage
                        src={currentUser?.image ?? ''}
                        alt={currentUser?.name ?? ''}
                        className={cn('rounded-md p-0 m-0 size-8', blurPersonalInfo && 'blur-sm')}
                      />
                      <AvatarFallback className={cn('rounded-md p-0 m-0 size-8', blurPersonalInfo && 'blur-sm')}>
                        {currentUser?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <p className={cn('font-medium text-sm leading-none truncate', blurPersonalInfo && 'blur-sm')}>
                        {currentUser?.name}
                      </p>
                      <div className="flex items-center mt-0.5 gap-1">
                        <div
                          className={cn(
                            'text-xs text-muted-foreground',
                            showEmail ? '' : 'max-w-[160px] truncate',
                            blurPersonalInfo && 'blur-sm',
                          )}
                          title={currentUser?.email || ''}
                        >
                          {formatEmail(currentUser?.email)}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowEmail(!showEmail);
                          }}
                          className="size-6 text-muted-foreground hover:text-foreground"
                        >
                          {showEmail ? <EyeSlashIcon size={12} /> : <EyeIcon size={12} />}
                          <span className="sr-only">{showEmail ? 'Hide email' : 'Show email'}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Sign Up / Login - only show if not authenticated */}
            {!isAuthenticated && (
              <>
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={() => {
                    setSignInDialogOpen(true);
                    setIsOpen(false);
                  }}
                >
                  <div className="w-full flex items-center gap-2">
                    <SignInIcon size={16} />
                    <span>Sign Up / Login</span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Settings - disabled */}
            {/* {isAuthenticated && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/settings')}>
                <div className="w-full flex items-center gap-2">
                  <GearIcon size={16} />
                  <span>Settings</span>
                </div>
              </DropdownMenuItem>
            )} */}

            {/* Lookout - disabled */}
            {/* {isAuthenticated && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push('/lookout')}>
                <div className="w-full flex items-center gap-2">
                  <HugeiconsIcon size={16} icon={BinocularsIcon} />
                  <span>Lookout</span>
                </div>
              </DropdownMenuItem>
            )} */}

            {/* Theme switcher */}
            <DropdownMenuItem className="cursor-pointer py-1 hover:bg-transparent!">
              <div className="flex items-center justify-between w-full px-0" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <SunIcon size={16} />
                  <span className="text-sm">Theme</span>
                </div>
                <ThemeSwitcher />
              </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* About */}
            <DropdownMenuItem className="cursor-pointer" asChild>
              <Link href="https://www.ritivel.com" className="w-full flex items-center gap-2" target="_blank" rel="noopener noreferrer">
                <InfoIcon size={16} />
                <span>About</span>
              </Link>
            </DropdownMenuItem>

            {/* Sign Out - only show if authenticated */}
            {isAuthenticated && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer w-full flex items-center justify-between gap-2"
                  onClick={() =>
                    signOut({
                      fetchOptions: {
                        onRequest: () => {
                          setSigningOut(true);
                          toast.loading('Signing out...');
                        },
                        onSuccess: () => {
                          setSigningOut(false);
                          localStorage.clear();
                          toast.success('Signed out successfully');
                          toast.dismiss();
                          window.location.href = '/new';
                        },
                        onError: () => {
                          setSigningOut(false);
                          toast.error('Failed to sign out');
                          window.location.reload();
                        },
                      },
                    })
                  }
                >
                  <span>Sign Out</span>
                  <SignOutIcon className="size-4" />
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Settings Dialog */}
        {settingsOpen !== undefined && setSettingsOpen && (
          <SettingsDialog
            open={settingsOpen}
            onOpenChange={setSettingsOpen}
            user={settingsUser}
            subscriptionData={subscriptionData}
            isProUser={isProUser}
            isProStatusLoading={isProStatusLoading}
            isCustomInstructionsEnabled={isCustomInstructionsEnabled}
            setIsCustomInstructionsEnabled={setIsCustomInstructionsEnabled}
            initialTab={settingsInitialTab}
          />
        )}

        <SignInPromptDialog
          open={signInDialogOpen}
          onOpenChange={(open) => {
            setSignInDialogOpen(open);
            if (!open) setSigningIn(false);
          }}
        />
      </>
    );
  },
);

// Add a display name for the memoized component for better debugging
UserProfile.displayName = 'UserProfile';

export { UserProfile };
