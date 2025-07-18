"use client";

import { LocationAssessment } from "@serverActions/assessmentUtil";
import { useState } from "react";

import { EditPage } from "./editPage";
import { ExportHome } from "./exportHome";

type ExportPageModes = "HOME" | "EDIT";
interface SelectedLocationObj {
  id: number;
  assessments: LocationAssessment[];
  exportRegistrationInfo: boolean;
  tallysIds: number[];
}
interface SelectedLocationSavedObj {
  id: number;
  saved: boolean;
}
const ExportClientPage = ({
  locations,
}: {
  locations: { id: number; name: string }[];
}) => {
  const [selectedLocationsObjs, setSelectedLocationsObjs] = useState<
    SelectedLocationObj[]
  >([]);
  const [selectedLocationsSaved, setSelectedLocationsSaved] = useState<
    SelectedLocationSavedObj[]
  >([]);
  const [pageState, setPageState] = useState<{
    pageMode: ExportPageModes;
    currentLocation: number | undefined;
  }>({ pageMode: "HOME", currentLocation: undefined });
  const handleSelectedLocationsAddition = (
    locationObj: SelectedLocationObj,
  ) => {
    if (
      !selectedLocationsObjs.some((location) => location.id === locationObj.id)
    ) {
      setSelectedLocationsObjs((prev) => [...prev, locationObj]);
    }
    if (
      !selectedLocationsSaved.some((location) => location.id === locationObj.id)
    ) {
      setSelectedLocationsSaved((prev) => [
        ...prev,
        { id: locationObj.id, saved: false },
      ]);
    }
  };
  const handleSelectedLocationObjChange = (
    locationId: number,
    assessments: LocationAssessment[],
    tallysIds: number[] | undefined,
    exportRegistrationInfo: boolean,
  ) => {
    setSelectedLocationsObjs((prev) =>
      prev.map((locationObj) =>
        locationObj.id === locationId ?
          {
            ...locationObj,
            exportRegistrationInfo: exportRegistrationInfo,
            ...(assessments && { assessments: assessments }),
            ...(tallysIds && { tallysIds: tallysIds }),
          }
        : locationObj,
      ),
    );

    /*setSelectedLocationsObjs((prev) =>
      prev.map((locationObj) =>
        locationObj.id === locationId ?
          { ...locationObj, exportRegistrationInfo }
        : locationObj,
      ),
    );*/
  };
  const handleSelectedLocationsSaveChange = (
    locationId: number,
    save: boolean,
  ) => {
    setSelectedLocationsSaved((prev) =>
      prev.map((locationObj) =>
        locationObj.id === locationId ?
          { id: locationId, saved: save }
        : locationObj,
      ),
    );
  };
  const handleSelectedLocationsRemoval = (id: number) => {
    if (selectedLocationsObjs.some((location) => location.id === id)) {
      setSelectedLocationsObjs((prev) => prev.filter((item) => item.id !== id));
    }
    if (selectedLocationsSaved.some((location) => location.id === id)) {
      setSelectedLocationsSaved((prev) =>
        prev.filter((item) => item.id !== id),
      );
    }
  };
  const handlePageStateChange = (
    id: number | undefined,
    pageMode: ExportPageModes,
  ) => {
    setPageState({ pageMode, currentLocation: id });
  };

  return (
    <div className="flex max-h-full min-h-0 w-full gap-5">
      <div className="flex w-full flex-col gap-1 overflow-auto rounded-3xl bg-gray-300/30 p-3 shadow-md">
        <h3 className="text-2xl font-semibold">Exportar dados</h3>
        {pageState.pageMode === "HOME" && (
          <ExportHome
            locations={locations}
            selectedLocationsObjs={selectedLocationsObjs}
            selectedLocationsSaved={selectedLocationsSaved}
            handleSelectedLocationsAddition={handleSelectedLocationsAddition}
            handleSelectedLocationsRemoval={handleSelectedLocationsRemoval}
            handlePageStateChange={handlePageStateChange}
          />
        )}
        {pageState.pageMode === "EDIT" && (
          <EditPage
            locationId={pageState.currentLocation}
            locations={locations}
            selectedLocationsObjs={selectedLocationsObjs}
            selectedLocationsSaved={selectedLocationsSaved}
            handlePageStateChange={handlePageStateChange}
            handleSelectedLocationsSaveChange={
              handleSelectedLocationsSaveChange
            }
            handleSelectedLocationObjChange={handleSelectedLocationObjChange}
          />
        )}
      </div>
    </div>
  );
};

export { ExportClientPage };
export {
  type ExportPageModes,
  type SelectedLocationObj,
  type SelectedLocationSavedObj,
};
