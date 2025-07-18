"use client";

import { TallyDataFetchedToTallyList } from "@customTypes/tallys/tallyList";
import {
  dateTimeWithoutSecondsFormmater,
  weekdayFormatter,
} from "@formatters/dateFormatters";

const TallyComponent = ({
  startDate,
  observer,
  tallyId,
  checked,
  handleTallyChange,
}: {
  startDate: Date;
  observer: string;
  tallyId: number;
  checked: boolean;
  handleTallyChange: (
    checked: boolean,
    value: number,
    removeSaveState: boolean,
  ) => void;
}) => {
  const handleDivClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!(e.target instanceof HTMLInputElement)) {
      handleTallyChange(!checked, tallyId, true);
    }
  };
  const weekday = weekdayFormatter.format(startDate);
  return (
    <div
      className="mb-2 flex items-center justify-between rounded bg-white p-2 outline-blue-500 hover:outline"
      onClick={(e) => handleDivClick(e)}
    >
      <span className="flex flex-row">
        <input
          type="checkbox"
          value={tallyId}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            handleTallyChange(e.target.checked, Number(e.target.value), true);
          }}
          checked={checked}
        />
        {`${weekday.charAt(0).toUpperCase() + weekday.slice(1)}, ${dateTimeWithoutSecondsFormmater.format(startDate)}`}
      </span>
      <span className="ml-auto">{observer}</span>
    </div>
  );
};

const TallyList = ({
  tallys,
  selectedTallys,
  handleTallyChange,
}: {
  tallys: TallyDataFetchedToTallyList[];
  selectedTallys: number[];
  handleTallyChange: (
    checked: boolean,
    value: number,
    removeSaveState: boolean,
  ) => void;
}) => {
  tallys.sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
  return tallys === undefined ?
      <h3>Nenhuma contagem para este local!</h3>
    : <div className="w-full p-2 text-black">
        {tallys.map((tally) => {
          const checked = selectedTallys?.includes(tally.id);
          return (
            <TallyComponent
              startDate={tally.startDate}
              observer={tally.user.username ?? "[ERRO]"}
              key={tally.id}
              tallyId={tally.id}
              checked={checked ? checked : false}
              handleTallyChange={handleTallyChange}
            />
          );
        })}
      </div>;
};

export { TallyList };
