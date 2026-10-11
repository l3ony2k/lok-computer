import { useEffect } from "react";
import type { ThemeId } from "@/lib/theme";
import { SYSTEM_VERSION } from "@/lib/system";
import "./kernel-panic.css";

/** Every "restart" on a panic screen leads here. The joke for whoever ran rm -rf /. */
export const RICK_ROLL_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

const retry = () => window.open(RICK_ROLL_URL, "_blank", "noopener,noreferrer");

/** "Press any key": a key or a tap anywhere restarts (into the song). */
const useAnyKey = (enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      event.preventDefault();
      retry();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled]);
};

const LinuxPanic = () => (
  <main className="system-boot-screen system-kernel-panic" aria-label="Kernel panic">
    <div className="system-boot-terminal">
      <div className="system-kernel-panic-title">KERNEL PANIC</div>
      <pre>{`Kernel panic - not syncing: No working init found.
VFS: Unable to mount root fs on unknown-block(0,0)
CPU: 0 PID: 1 Comm: init Not tainted ${SYSTEM_VERSION}
Call Trace:
 panic+0x101/0x2e3
 mount_block_root+0x16a/0x31d
 prepare_namespace+0x13f/0x175
 kernel_init_freeable+0x2c8/0x2f2
---[ end Kernel panic - not syncing: VFS: Unable to mount root fs ]---`}</pre>
      <button type="button" className="system-kernel-retry" onClick={retry}>
        RETRY BOOT
      </button>
    </div>
  </main>
);

/** 98: the fatal exception screen, white on blue, any key continues. */
const BlueScreen98 = () => {
  useAnyKey(true);
  return (
    <main className="panic-screen panic-bsod panic-bsod-98" aria-label="Fatal exception" onClick={retry}>
      <div className="panic-bsod-body">
        <p className="panic-bsod-title"><span>lok.computer</span></p>
        <p>
          A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) + 00010E36. The current application
          will be terminated.
        </p>
        <p>
          *  Press any key to terminate the current application.<br />
          *  Press CTRL+ALT+DEL again to restart your computer. You will<br />
          &nbsp;&nbsp;&nbsp;lose any unsaved information in all applications.
        </p>
        <p className="panic-bsod-center">Press any key to continue <span className="panic-cursor">_</span></p>
      </div>
    </main>
  );
};

/** XP and 7: the stop error, with the technical information block. */
const BlueScreenXP = () => {
  useAnyKey(true);
  return (
    <main className="panic-screen panic-bsod panic-bsod-xp" aria-label="Stop error" onClick={retry}>
      <div className="panic-bsod-body">
        <p>A problem has been detected and lok.computer has been shut down to prevent damage to your computer.</p>
        <p>ROOT_FILESYSTEM_DELETED</p>
        <p>
          If this is the first time you've seen this Stop error screen, restart your computer. If this screen
          appears again, follow these steps:
        </p>
        <p>
          Check to make sure any new hardware or software is properly installed. Stop typing rm -rf / into the
          Console. If problems continue, disable or remove any newly installed hardware or software.
        </p>
        <p>Technical information:</p>
        <p>*** STOP: 0x0000007B (0xF78D2524, 0xC0000034, 0x00000000, 0x00000000)</p>
        <p>
          Beginning dump of physical memory<br />
          Physical memory dump complete.<br />
          Press any key to restart <span className="panic-cursor">_</span>
        </p>
      </div>
    </main>
  );
};

/** System: the bomb dialog on the gray desktop. */
const BombDialog = () => (
  <main className="panic-screen panic-mac" aria-label="System error">
    <div className="panic-mac-dialog" role="alertdialog" aria-labelledby="panic-mac-title">
      <svg className="panic-mac-bomb" viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges">
        <path d="M20 2h2v2h2v2h-2v2h-2V6h-2V4h2z" fill="#000" />
        <path d="M24 0h2v2h-2zM26 2h2v2h-2zM22 4h2v2h-2z" fill="#000" />
        <circle cx="13" cy="19" r="11" fill="#000" />
        <path d="M11 10h4v4h-4z" fill="#000" />
        <path d="M7 15h3v3H7z" fill="#fff" />
      </svg>
      <div>
        <p id="panic-mac-title">Sorry, a system error occurred.</p>
        <p>“lok.computer” unexpectedly quit because of rm -rf /.</p>
        <button type="button" className="panic-mac-button" onClick={retry}>Restart</button>
      </div>
    </div>
  </main>
);

/** TUI: the Amiga Guru Meditation, a flashing red frame on black. */
const GuruMeditation = () => (
  <main className="panic-screen panic-guru" aria-label="Software failure" onClick={retry}>
    <div className="panic-guru-box" role="alert">
      <p>Software Failure.&nbsp;&nbsp;&nbsp;Press left mouse button to continue.</p>
      <p>Guru Meditation #00000004.00C0FFEE</p>
    </div>
  </main>
);

/** 386: DOS has no panic, only a critical error handler. */
const DosError = () => {
  useAnyKey(true);
  return (
    <main className="panic-screen panic-dos" aria-label="Critical error" onClick={retry}>
      <pre>{`C:\\>rm -rf /

Not ready reading drive C
Abort, Retry, Fail?`}<span className="panic-cursor">_</span></pre>
    </main>
  );
};

/** CS 1.6: the engine's fatal error box. */
const HostError = () => (
  <main className="panic-screen panic-cs" aria-label="Fatal error">
    <div className="panic-cs-dialog" role="alertdialog" aria-labelledby="panic-cs-title">
      <p id="panic-cs-title" className="panic-cs-title">Fatal Error</p>
      <p>Host_Error: Couldn't load /. The filesystem is gone (rm -rf /).</p>
      <div className="panic-cs-actions">
        <button type="button" onClick={retry}>OK</button>
      </div>
    </div>
  </main>
);

/** BeOS: Kernel Debugging Land. */
const KernelDebuggingLand = () => (
  <main className="panic-screen panic-kdl" aria-label="Kernel debugger">
    <pre>{`PANIC: rm -rf / : root filesystem has left the building
Welcome to Kernel Debugging Land...
Running on CPU 0
kdebug> bt
 iframe at 0x80003e80
  0x8004a1b2 panic+0x6a
  0x800b7c40 vfs_mount_root+0x12c
  0x800014e0 _start+0x30`}</pre>
    <p className="panic-kdl-prompt">kdebug&gt; <button type="button" className="panic-kdl-command" onClick={retry}>continue</button></p>
  </main>
);

/** Palm: the fatal exception dialog. */
const PalmFatal = () => (
  <main className="panic-screen panic-palm" aria-label="Fatal exception">
    <div className="panic-palm-dialog" role="alertdialog" aria-labelledby="panic-palm-title">
      <p id="panic-palm-title" className="panic-palm-title">Fatal Exception</p>
      <p>MemoryMgr.c, Line:3579, NULL handle (rm -rf /)</p>
      <button type="button" onClick={retry}>Reset</button>
    </div>
  </main>
);

const SCREENS: Record<ThemeId, () => JSX.Element> = {
  lok: LinuxPanic,
  "98": BlueScreen98,
  xp: BlueScreenXP,
  "7": BlueScreenXP,
  system: BombDialog,
  tui: GuruMeditation,
  "386": DosError,
  cs16: HostError,
  beos: KernelDebuggingLand,
  palm: PalmFatal,
};

/** The screen after `rm -rf /`, in the style of the running theme; every way out plays the song. */
export const KernelPanic = ({ theme }: { theme: ThemeId }) => {
  const Screen = SCREENS[theme] ?? LinuxPanic;
  return <Screen />;
};
