import CDialog from "@/components/ui/dialog/cDialog";
import { FetchFormsResponse } from "@/lib/serverFunctions/queries/form";

import { AssessmentsFilterType } from "./assessmentsClient";
import AssessmentsFilter from "./assessmentsFilter";

const AssessmentsFilterSidebar = ({
  formsPromise,
  usersPromise,
  selectedLocationId,
  defaultLocationId,
  isDialog,
  openDialog,
  onNoCitiesFound,
  onCloseDialog,
  handleFilterChange,
}: {
  formsPromise: Promise<FetchFormsResponse["forms"]>;
  usersPromise: Promise<{ id: string; username: string }[]>;
  selectedLocationId: number | undefined;
  defaultLocationId: number | undefined;
  isDialog?: boolean;
  openDialog?: boolean;
  onNoCitiesFound?: () => void;
  onCloseDialog?: () => void;
  handleFilterChange: (params: {
    type: AssessmentsFilterType;
    newValue: string | number | Date | null;
  }) => void;
}) => {
  const innerComponent = (
    <div className="h-full w-full overflow-auto border-l border-gray-200 px-1">
      <AssessmentsFilter
        defaultLocationId={defaultLocationId}
        selectedLocationId={selectedLocationId}
        formsPromise={formsPromise}
        usersPromise={usersPromise}
        onNoCitiesFound={onNoCitiesFound}
        handleFilterChange={handleFilterChange}
      />
    </div>
  );
  if (isDialog) {
    return (
      <CDialog
        title="Filtros"
        fullScreen
        keepMounted
        open={openDialog ?? false}
        onClose={() => {
          onCloseDialog?.();
        }}
      >
        {innerComponent}
      </CDialog>
    );
  }
  return <div className="basis-2/5">{innerComponent}</div>;
};

export default AssessmentsFilterSidebar;
