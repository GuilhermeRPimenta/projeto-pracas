import LocationSelector from "@/components/locationSelector/locationSelector";
import { FINALIZATION_STATUS } from "@/lib/enums/finalizationStatus";
import { FetchFormsResponse } from "@/lib/serverFunctions/queries/form";
import { Divider } from "@mui/material";
import { IconExternalLink } from "@tabler/icons-react";
import { useRouter } from "next-nprogress-bar";
import { Suspense, use, useState } from "react";

import CAutocomplete from "../../../components/ui/cAutoComplete";
import CDateTimePicker from "../../../components/ui/cDateTimePicker";
import { AssessmentsFilterType } from "./assessmentsClient";

const statusOptions = [
  {
    id: FINALIZATION_STATUS.ALL,
    label: "Todos",
  },
  {
    id: FINALIZATION_STATUS.NOT_FINALIZED,
    label: "Em progresso",
  },
  {
    id: FINALIZATION_STATUS.FINALIZED,
    label: "Finalizado",
  },
];

const FormSelector = ({
  formsPromise,
  handleFilterChange,
}: {
  formsPromise: Promise<FetchFormsResponse["forms"]>;
  handleFilterChange: (params: {
    type: AssessmentsFilterType;
    newValue: string | number | Date | null;
  }) => void;
}) => {
  const router = useRouter();
  const forms = use(formsPromise);

  const [isRedirecting, setIsRedirecting] = useState(false);

  return (
    <CAutocomplete
      label="Formulário"
      className="w-full"
      options={forms}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={(i) => i.name}
      onChange={(_, a) =>
        handleFilterChange({ type: "FORM_ID", newValue: a?.id ?? null })
      }
      suffixButtonChildren={<IconExternalLink />}
      suffixButtonLoading={isRedirecting}
      onSuffixButtonClick={() => {
        setIsRedirecting(true);
        router.push("/admin/forms");
      }}
    />
  );
};

const UserSelector = ({
  usersPromise,
  handleFilterChange,
}: {
  usersPromise: Promise<{ id: string; username: string }[]>;
  handleFilterChange: (params: {
    type: AssessmentsFilterType;
    newValue: string | number | Date | null;
  }) => void;
}) => {
  const users = use(usersPromise);

  return (
    <CAutocomplete
      label="Responsável"
      options={users}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      getOptionLabel={(i) => i.username}
      onChange={(_, a) =>
        handleFilterChange({ type: "USER_ID", newValue: a?.id ?? null })
      }
    />
  );
};

const AssessmentsFilter = ({
  formsPromise,
  usersPromise,
  selectedLocationId,
  defaultLocationId,
  onNoCitiesFound,
  handleFilterChange,
}: {
  formsPromise: Promise<FetchFormsResponse["forms"]>;
  usersPromise: Promise<{ id: string; username: string }[]>;
  selectedLocationId: number | undefined;
  defaultLocationId: number | undefined;
  onNoCitiesFound?: () => void;
  handleFilterChange: (params: {
    type: AssessmentsFilterType;
    newValue: string | number | Date | null;
  }) => void;
}) => {
  return (
    <div className="flex flex-col gap-1">
      <h4>Localização</h4>
      <LocationSelector
        defaultLocationId={defaultLocationId}
        selectedLocationId={selectedLocationId}
        onNoCitiesFound={onNoCitiesFound}
        onSelectedLocationChange={(v) => {
          handleFilterChange({ type: "LOCATION_ID", newValue: v?.id ?? null });
        }}
        onSelectedCityChange={(v) => {
          handleFilterChange({ type: "CITY_ID", newValue: v?.id ?? null });
        }}
        onSelectedBroadUnitChange={(v) => {
          handleFilterChange({
            type: "BROAD_UNIT_ID",
            newValue: v?.broadUnitId ?? null,
          });
        }}
        onSelectedIntermediateUnitChange={(v) => {
          handleFilterChange({
            type: "INTERMEDIATE_UNIT_ID",
            newValue: v?.intermediateUnitId ?? null,
          });
        }}
        onSelectedNarrowUnitChange={(v) => {
          handleFilterChange({
            type: "NARROW_UNIT_ID",
            newValue: v?.narrowUnitId ?? null,
          });
        }}
      />
      <Divider />
      <h4>Formulário</h4>
      <Suspense
        fallback={
          <CAutocomplete
            label="Formulário"
            className="w-full"
            options={[]}
            loading
          />
        }
      >
        <FormSelector
          formsPromise={formsPromise}
          handleFilterChange={handleFilterChange}
        />
      </Suspense>
      <Divider />
      <h4>Data inicial</h4>
      <CDateTimePicker
        label="Início - Data inicial"
        debounce={600}
        clearable
        onAccept={(e) => {
          handleFilterChange({
            type: "START_DATE",
            newValue: e?.toDate() ?? null,
          });
        }}
      />
      <CDateTimePicker
        label="Início - Data final"
        debounce={600}
        clearable
        onAccept={(e) => {
          handleFilterChange({
            type: "END_DATE",
            newValue: e?.toDate() ?? null,
          });
        }}
      />
      <Divider />
      <h4>Responsável</h4>
      <Suspense
        fallback={<CAutocomplete label="Responsável" options={[]} loading />}
      >
        <UserSelector
          usersPromise={usersPromise}
          handleFilterChange={handleFilterChange}
        />
      </Suspense>
      <Divider />
      <h4>Status</h4>
      <CAutocomplete
        label="Status"
        options={statusOptions}
        defaultValue={statusOptions[0]}
        disableClearable
        isOptionEqualToValue={(option, value) => option.id === value.id}
        getOptionLabel={(i) => i.label}
        onChange={(_, a) =>
          handleFilterChange({
            type: "FINALIZATION_STATUS",
            newValue: a.id,
          })
        }
      />
    </div>
  );
};

export default AssessmentsFilter;
