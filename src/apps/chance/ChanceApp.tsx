import React, { useCallback, useEffect } from 'react';
import { createId } from '@/lib/id';
import { WindowLayout } from '@/components/window/WindowLayout';
import { RetroButton } from '@/components/ui/RetroButton';
import { usePersistedState } from '@/hooks/useStorage';
import { useApplicationLauncher } from '@/hooks/useApplicationLauncher';
import {
  CHANCE_TABS,
  DEFAULT_CHANCE_STATE,
  isChanceTab,
  normalizeChanceState,
  tarotQuestion,
  type ChanceState,
  type ChanceTab,
} from './random';
import { useCardTable, useCoinTable, useDiceTable, useTarotTable } from './useChanceTables';
import { CardsTab, CoinTab, DiceTab, TarotTab } from './ChanceTabs';
import { HistoryShown } from './historyShown';
import { TabStrip } from '@/components/ui/TabStrip';
import { M8gicTab, useM8gicTable } from './M8gicTab';
import { IChingTab, useIChingTable } from './IChingTab';
import { MoonBlocksTab, useMoonBlocksTable } from './MoonBlocksTab';
import { WheelTab, useWheelTable } from './WheelTab';
import './chance.css';

export interface ChanceAppProps {
  /** Tab to open; the share link carries it as `?tab=`. */
  initialTab?: string;
  onPropsChange?: (props: Record<string, unknown>) => void;
}

const STORAGE_KEY = 'app:chance';
/** Catalog identity of Ask AI (predates its rename). */
const ASK_AI_TYPE = 'AI Talk';

/**
 * Dice, coins, playing cards and tarot. Every tab is a table (ChanceTable):
 * the things on it are changed where they lie, one button acts, and the
 * history sits beside it. Everything comes from Math.random, which the footer
 * says out loud: fine for games, never for secrets.
 */
export const ChanceApp: React.FC<ChanceAppProps> = ({ initialTab, onPropsChange }) => {
  const openApplication = useApplicationLauncher();
  const [state, setState] = usePersistedState<ChanceState>({
    key: STORAGE_KEY,
    defaultValue: isChanceTab(initialTab) ? { ...DEFAULT_CHANCE_STATE, tab: initialTab } : DEFAULT_CHANCE_STATE,
    normalize: (stored) => {
      const normalized = normalizeChanceState(stored);
      // A deep link's tab wins over the remembered one.
      return isChanceTab(initialTab) ? { ...normalized, tab: initialTab } : normalized;
    },
    debounceMs: 200,
  });

  useEffect(() => {
    onPropsChange?.({ initialTab: state.tab });
  }, [onPropsChange, state.tab]);

  const setTab = (tab: ChanceTab) => setState((prev) => ({ ...prev, tab }));
  const toggleHistory = useCallback(() => setState((prev) => ({ ...prev, history: !prev.history })), [setState]);

  // Every tab's table lives here, so its history survives switching tabs.
  const dice = useDiceTable(state.dice, setState);
  const coins = useCoinTable(state.coins, setState);
  const cards = useCardTable(state.jokers, setState, state.tab === 'cards');
  const tarot = useTarotTable(state.tab === 'tarot');
  const m8gic = useM8gicTable();
  const iching = useIChingTable(state.tab === 'iching');
  const moon = useMoonBlocksTable();
  const wheel = useWheelTable();

  const askQuestion = useCallback((question: string) => {
    openApplication(ASK_AI_TYPE, { props: { ask: { id: createId(), question } } });
  }, [openApplication]);

  const reading = tarot.reading;
  const askAi = useCallback(() => {
    if (!reading) return;
    openApplication(ASK_AI_TYPE, { props: { ask: { id: createId(), question: tarotQuestion(reading.draws) } } });
  }, [openApplication, reading]);

  return (
    <WindowLayout
      className="chance-window"
      hasPadding={false}
      toolbar={
        <TabStrip tabs={CHANCE_TABS} selected={state.tab} onSelect={setTab} label="Chance" />
      }
      footer={
        <div className="app-footer-row app-footer-note chance-footer">
          <span>Chance is an illusion, don't use this for secrets.</span>
          <div className="app-footer-actions">
            <RetroButton active={state.history} aria-pressed={state.history} aria-controls="chance-history" onClick={toggleHistory}>History</RetroButton>
          </div>
        </div>
      }
    >
      <HistoryShown.Provider value={state.history}>
        {state.tab === 'dice' && <DiceTab table={dice} />}
        {state.tab === 'coin' && <CoinTab table={coins} />}
        {state.tab === 'cards' && <CardsTab table={cards} />}
        {state.tab === 'tarot' && <TarotTab table={tarot} onAsk={askAi} />}
        {state.tab === 'm8gic' && <M8gicTab table={m8gic} />}
        {state.tab === 'iching' && <IChingTab table={iching} onAsk={askQuestion} />}
        {state.tab === 'moon' && <MoonBlocksTab table={moon} />}
        {state.tab === 'wheel' && <WheelTab table={wheel} />}
      </HistoryShown.Provider>
    </WindowLayout>
  );
};

export default ChanceApp;
