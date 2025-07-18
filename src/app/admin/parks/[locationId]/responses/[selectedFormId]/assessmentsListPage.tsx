"use client";

import { useHelperCard } from "@components/context/helperCardContext";
import { WeekdaysFilterItems } from "@customTypes/dates/dates";
import { weekdayFormatter } from "@formatters/dateFormatters";
import { FinalizedAssessmentsList } from "@queries/assessment";
import React, { useEffect, useRef, useState } from "react";

import { AssessmentsFilter } from "./assessmentsFilter";
import { AssessmentsList } from "./assessmentsList";

const AssessmentsListPage = ({
  locationId,
  locationName,
  formId,
  assessments,
}: {
  locationId: number;
  locationName: string;
  formId: number;
  assessments: FinalizedAssessmentsList;
}) => {
  const { setHelperCard } = useHelperCard();
  const [isMobileView, setIsMobileView] = useState(false);
  const weekdaysFilter = useRef<WeekdaysFilterItems[]>([]);
  const initialDateFilter = useRef(0);
  const finalDateFilter = useRef(0);
  const [activeAssessments, setActiveAssessments] = useState(
    assessments.assessments,
  );

  useEffect(() => {
    window.addEventListener("resize", () => {
      if (window.innerWidth < 1100) {
        setIsMobileView(true);
      } else {
        setIsMobileView(false);
      }
    });
    if (window.innerWidth < 1100) {
      setIsMobileView(true);
    } else {
      setIsMobileView(false);
    }
  }, []);

  useEffect(() => {
    if (assessments.statusCode === 401) {
      setHelperCard({
        show: true,
        helperCardType: "ERROR",
        content: <>Sem permissão para acessar avaliações!</>,
      });
    } else if (assessments.statusCode === 500) {
      setHelperCard({
        show: true,
        helperCardType: "ERROR",
        content: <>Erro ao carregar avaliações!</>,
      });
    }
  }, [assessments, setHelperCard]);

  const handleInitialDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    const millisecondsSinceEpoch =
      selectedDate ? new Date(selectedDate).getTime() : null;
    if (millisecondsSinceEpoch)
      initialDateFilter.current = millisecondsSinceEpoch;
    else initialDateFilter.current = 0;
    updateFilteredAssessments();
  };

  const handleFinalDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedDate = e.target.value;
    const millisecondsSinceEpoch =
      selectedDate ? new Date(selectedDate).getTime() : null;
    if (millisecondsSinceEpoch)
      finalDateFilter.current = millisecondsSinceEpoch;
    else finalDateFilter.current = 0;
    updateFilteredAssessments();
  };

  const handleWeekdayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked)
      weekdaysFilter.current = [
        ...weekdaysFilter.current,
        e.target.value as WeekdaysFilterItems,
      ];
    else
      weekdaysFilter.current = weekdaysFilter.current.filter(
        (day) => day !== e.target.value,
      );
    updateFilteredAssessments();
  };

  const updateFilteredAssessments = () => {
    if (!assessments) {
      return;
    }
    const filteredAssessments = assessments.assessments.filter((assessment) => {
      if (weekdaysFilter.current.length > 0) {
        if (
          !weekdaysFilter.current.includes(
            weekdayFormatter.format(
              assessment.startDate,
            ) as WeekdaysFilterItems,
          )
        ) {
          return false;
        }
      }

      if (initialDateFilter.current === 0 && finalDateFilter.current === 0) {
        return true;
      } else if (initialDateFilter.current === 0) {
        if (assessment.startDate.getTime() <= finalDateFilter.current)
          return true;
      } else if (finalDateFilter.current === 0) {
        if (assessment.startDate.getTime() >= initialDateFilter.current)
          return true;
      } else {
        if (
          assessment.startDate.getTime() >= initialDateFilter.current &&
          assessment.startDate.getTime() <= finalDateFilter.current
        ) {
          return true;
        }
      }
    });
    setActiveAssessments(filteredAssessments);
  };
  return (
    <div className={"flex max-h-full min-h-0 flex-col gap-5"}>
      <div
        className={`flex gap-5 overflow-auto rounded-3xl bg-gray-300/30 p-3 shadow-md ${isMobileView && "flex-col items-center"}`}
      >
        {isMobileView && (
          <h3 className={"text-2xl font-semibold"}>
            {`Avaliações finalizadas de ${locationName}`}
          </h3>
        )}

        {!isMobileView && (
          <div className={"flex basis-3/5 flex-col gap-1 overflow-auto"}>
            {!assessments.assessments || assessments.assessments.length === 0 ?
              <h3>Nenhuma avaliação finalizada para este local!</h3>
            : <>
                <AssessmentsList
                  locationId={locationId}
                  formId={formId}
                  assessments={activeAssessments}
                />
              </>
            }
          </div>
        )}

        <div
          className={`flex h-fit ${!isMobileView && "min-w-[530px]"} flex-col gap-1 rounded-3xl bg-gray-400/20 p-3 shadow-inner`}
        >
          <AssessmentsFilter
            locationId={locationId}
            locationName={locationName}
            formId={formId}
            filteredAssessments={activeAssessments}
            handleWeekdayChange={handleWeekdayChange}
            handleInitialDateChange={handleInitialDateChange}
            handleFinalDateChange={handleFinalDateChange}
          />
        </div>
        {isMobileView && (
          <div className={"flex w-full flex-col gap-1"}>
            {!assessments || assessments.assessments.length === 0 ?
              <h3>Nenhuma avaliação finalizada para este local!</h3>
            : <>
                <AssessmentsList
                  locationId={locationId}
                  formId={formId}
                  assessments={activeAssessments}
                />
              </>
            }
          </div>
        )}
      </div>
    </div>
  );
};

export { AssessmentsListPage };
