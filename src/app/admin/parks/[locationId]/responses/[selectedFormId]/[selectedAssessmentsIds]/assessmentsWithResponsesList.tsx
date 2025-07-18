"use client";

import { Button } from "@/components/button";
import { useHelperCard } from "@components/context/helperCardContext";
import { Checkbox } from "@components/ui/checkbox";
import { RadioButton } from "@components/ui/radioButton";
import { ResponseCalculation } from "@customTypes/assessments/calculation";
import { QuestionTypes } from "@prisma/client";
import { AssessmentsWithResposes } from "@queries/assessment";
import { fetchAssessmentGeometries } from "@serverOnly/geometries";
import { IconCaretDownFilled, IconCaretUpFilled } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { MapPopup } from "./MapPopup";
import { FrequencyObjByCategory } from "./frequencyTable";

type FetchedAssessmentGeometries = NonNullable<
  Awaited<ReturnType<typeof fetchAssessmentGeometries>>
>;

type SingleAssessment = AssessmentsWithResposes["assessments"][number];

const AssessmentComponent = ({
  assessment,
  assessmentGeometries,
}: {
  assessment: SingleAssessment;
  assessmentGeometries: FetchedAssessmentGeometries | undefined;
}) => {
  const options = useRef(
    assessment.form.questions.flatMap((question) => {
      return question.options;
    }),
  );
  const responses = useRef<{
    [key: number]: { value: string[]; type: QuestionTypes };
  }>(
    assessment.form.questions.reduce(
      (acc, question) => {
        const valueArray: string[] = [];
        if (question.type === "WRITTEN") {
          const currentResponseArray = assessment.response.filter(
            (respose) => respose.questionId === question.id,
          );
          const currentResponse = currentResponseArray[0];
          if (currentResponse && currentResponse.response) {
            valueArray.push(currentResponse.response);
          }
        } else {
          const currentResponseArray = assessment.responseOption.filter(
            (resposeOption) => resposeOption.questionId === question.id,
          );
          for (const currentResponse of currentResponseArray) {
            if (currentResponse.option)
              valueArray.push(currentResponse.option.id.toString());
          }
          if (valueArray.length === 0) {
            valueArray.push("null");
          }
        }
        acc[question.id] = { value: valueArray, type: question.type };
        return acc;
      },
      {} as { [key: number]: { value: string[]; type: QuestionTypes } },
    ) || {},
  );
  const calculateSum = (calculation: ResponseCalculation) => {
    let sum = 0;
    calculation.questions.forEach((question) => {
      const questionResponse = responses.current[question.id];
      if (questionResponse) {
        if (question.type === "WRITTEN") {
          questionResponse.value.forEach((v) => {
            const questionResponseValue = Number(v);
            if (!Number.isNaN(questionResponseValue)) {
              sum += questionResponseValue;
            }
          });
        } else {
          const questionOptions =
            options.current.filter(
              (opt) => opt && opt.questionId === question.id,
            ) || [];
          questionResponse.value.forEach((v) => {
            const questionResponseValue = Number(
              questionOptions.find((opt) => opt.id === Number(v))?.text,
            );
            if (!Number.isNaN(questionResponseValue)) {
              sum += questionResponseValue;
            }
          });
        }
      }
    });
    return sum;
  };

  const calculateAverage = (calculation: ResponseCalculation) => {
    let sum = 0;
    let questionsAmount = 0;
    calculation.questions.forEach((question) => {
      const questionResponse = responses.current[question.id];
      if (questionResponse) {
        if (question.type === "WRITTEN") {
          questionResponse.value.forEach((v) => {
            const questionResponseValue = Number(v);
            if (!Number.isNaN(questionResponseValue)) {
              sum += questionResponseValue;
              questionsAmount++;
            }
          });
        } else {
          const questionOptions =
            options.current.filter(
              (opt) => opt && opt.questionId === question.id,
            ) || [];
          questionResponse.value.forEach((v) => {
            const questionResponseValue = Number(
              questionOptions.find((opt) => opt.id === Number(v))?.text,
            );
            if (!Number.isNaN(questionResponseValue)) {
              sum += questionResponseValue;
              questionsAmount++;
            }
          });
        }
      }
    });

    const average = sum / questionsAmount;
    if (Number.isNaN(average)) {
      return 0;
    }
    return average;
  };

  const calculatePercentages = (calculation: ResponseCalculation) => {
    const responsesByQuestion = new Map<string, number>();
    let sum = 0;
    calculation.questions.forEach((question) => {
      const questionResponse = responses.current[question.id];
      if (questionResponse) {
        if (question.type === "WRITTEN") {
          questionResponse.value.forEach((v) => {
            const questionResponseValue = Number(v);
            if (!Number.isNaN(questionResponseValue)) {
              sum += questionResponseValue;
              responsesByQuestion.set(question.name, questionResponseValue);
            }
          });
        } else {
          const questionOptions =
            options.current.filter(
              (opt) => opt && opt.questionId === question.id,
            ) || [];
          questionResponse.value.forEach((v) => {
            const questionResponseValue = Number(
              questionOptions.find((opt) => opt.id === Number(v))?.text,
            );
            if (!Number.isNaN(questionResponseValue)) {
              sum += questionResponseValue;
              responsesByQuestion.set(question.name, questionResponseValue);
            }
          });
        }
      }
    });
    return Array.from(responsesByQuestion).map(([key, value]) => (
      <p key={key}>
        {`${key}: 
          ${!Number.isNaN(value / sum) ? ((value / sum) * 100).toFixed(2) : "0"}%`}
      </p>
    ));
  };
  const [expanded, setExpanded] = useState(false);
  const frequencies: FrequencyObjByCategory[] = [];
  assessment.form.questions.forEach((question) => {
    if (!frequencies.find((category) => category.id === question.category.id)) {
      frequencies.push({
        id: question.category.id,
        categoryName: question.category.name,
        questions: [],
        subcategories: [],
        calculations: [],
      });
    }
    const currentCategoryObj = frequencies.find(
      (category) => category.id === question.category.id,
    );
    if (currentCategoryObj !== undefined) {
      const questionSubcategory = question.subcategory;
      if (
        questionSubcategory &&
        currentCategoryObj.subcategories.find(
          (subcategory) => subcategory.id === questionSubcategory.id,
        ) === undefined
      ) {
        currentCategoryObj.subcategories.push({
          id: questionSubcategory.id,
          subcategoryName: questionSubcategory.name,
          questions: [],
          calculations: [],
        });
      }
      if (questionSubcategory) {
        const currentSubcategoryObj = currentCategoryObj.subcategories.find(
          (subcategory) => subcategory.id === questionSubcategory.id,
        );
        if (currentSubcategoryObj) {
          if (
            currentSubcategoryObj.questions.find(
              (subcategoryQuestion) => subcategoryQuestion.id === question.id,
            ) === undefined
          ) {
            currentSubcategoryObj.questions.push({
              id: question.id,
              questionName: question.name,
              type: question.type,
              optionType: question.optionType,
              responses: [],
            });
          }
          const currentQuestionObj = currentSubcategoryObj.questions.find(
            (subcategoryQuestion) => subcategoryQuestion.id === question.id,
          );
          if (currentQuestionObj !== undefined) {
            if (question.type === "OPTIONS") {
              question.options.forEach((option) => {
                if (
                  !currentQuestionObj.responses.find(
                    (response) => response.text === option.text,
                  )
                ) {
                  currentQuestionObj.responses.push({
                    text: option.text,
                    frequency: 0,
                  });
                }
              });
              const assessmentResponsesOption =
                assessment.responseOption.filter(
                  (responseOption) => responseOption.questionId === question.id,
                );
              assessmentResponsesOption.forEach((assessmentResponseOption) => {
                const currentResponseObj = currentQuestionObj.responses.find(
                  (response) =>
                    response.text === assessmentResponseOption.option?.text,
                );
                if (currentResponseObj) {
                  currentResponseObj.frequency++;
                }
              });
            } else {
              const assessmentResponse = assessment.response.find(
                (response) => response.questionId === question.id,
              );
              if (assessmentResponse && assessmentResponse.response) {
                if (
                  currentQuestionObj.responses.find(
                    (questionResponse) =>
                      questionResponse.text === assessmentResponse.response,
                  ) === undefined
                ) {
                  currentQuestionObj.responses.push({
                    text: assessmentResponse.response,
                    frequency: 0,
                  });
                }
                const currentResponseObj = currentQuestionObj.responses.find(
                  (questionResponse) =>
                    questionResponse.text === assessmentResponse.response,
                );
                if (currentResponseObj) {
                  currentResponseObj.frequency++;
                }
              }
            }
          }
        }
      } else {
        if (
          currentCategoryObj.questions.find(
            (categoryQuestion) => categoryQuestion.id === question.id,
          ) === undefined
        ) {
          currentCategoryObj.questions.push({
            id: question.id,
            questionName: question.name,
            type: question.type,
            optionType: question.optionType,
            responses: [],
          });
        }
        const currentQuestionObj = currentCategoryObj.questions.find(
          (categoryQuestion) => categoryQuestion.id === question.id,
        );
        if (currentQuestionObj !== undefined) {
          if (question.type === "OPTIONS") {
            question.options.forEach((option) => {
              if (
                !currentQuestionObj.responses.find(
                  (response) => response.text === option.text,
                )
              ) {
                currentQuestionObj.responses.push({
                  text: option.text,
                  frequency: 0,
                });
              }
            });
            const assessmentResponsesOption = assessment.responseOption.filter(
              (responseOption) => responseOption.questionId === question.id,
            );
            assessmentResponsesOption.forEach((assessmentResponseOption) => {
              const currentResponseObj = currentQuestionObj.responses.find(
                (response) =>
                  response.text === assessmentResponseOption.option?.text,
              );
              if (currentResponseObj) {
                currentResponseObj.frequency++;
              }
            });
          } else {
            const assessmentResponse = assessment.response.find(
              (response) => response.questionId === question.id,
            );
            if (assessmentResponse && assessmentResponse.response) {
              if (
                currentQuestionObj.responses.find(
                  (questionResponse) =>
                    questionResponse.text === assessmentResponse.response,
                ) === undefined
              ) {
                currentQuestionObj.responses.push({
                  text: assessmentResponse.response,
                  frequency: 0,
                });
              }
              const currentResponseObj = currentQuestionObj.responses.find(
                (questionResponse) =>
                  questionResponse.text === assessmentResponse.response,
              );
              if (currentResponseObj) {
                currentResponseObj.frequency++;
              }
            }
          }
        }
      }
    }
  });
  frequencies.forEach((category) => {
    const currentCategoryCalculations = assessment.form.calculations.filter(
      (calculation) =>
        calculation.categoryId === category.id && !calculation.subcategoryId,
    );
    category.calculations = currentCategoryCalculations;
    category.subcategories.forEach((subcategory) => {
      const currentSubcategoryCalculations =
        assessment.form.calculations.filter(
          (calculation) => calculation.subcategoryId === subcategory.id,
        );
      subcategory.calculations = currentSubcategoryCalculations;
    });
  });

  return (
    <div className="mb-2 flex flex-col rounded bg-gray-600/30 p-2 shadow-inner">
      <div className="flex items-center justify-between">
        <span>
          {assessment.startDate.toLocaleString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
          }) + `, ${assessment.user.username}`}
        </span>

        <Button className="p-1" onPress={() => setExpanded((prev) => !prev)}>
          {expanded ?
            <IconCaretUpFilled />
          : <IconCaretDownFilled />}
        </Button>
      </div>
      {expanded && (
        <ul className="list-disc p-3">
          {frequencies.map((category) => {
            return (
              <div key={category.id}>
                <span className="text-2xl font-bold">
                  {category.categoryName}
                </span>
                {category.questions.map((question) => {
                  return (
                    <div key={question.id} className="my-4 flex flex-col">
                      <span className="font-bold">{question.questionName}</span>

                      {question.responses.length === 0 ?
                        <span>SEM RESPOSTA</span>
                      : question.responses.map((response) => {
                          return (
                            <div
                              className="flex gap-1"
                              key={`${question.id}-${response.text}`}
                            >
                              {question.type === "OPTIONS" &&
                                (question.optionType === "RADIO" ?
                                  <RadioButton
                                    disabled
                                    checked={response.frequency !== 0}
                                  />
                                : <Checkbox
                                    disabled
                                    checked={response.frequency !== 0}
                                  />)}

                              <span>{response.text}</span>
                            </div>
                          );
                        })
                      }
                      {assessmentGeometries?.some(
                        (geo) => geo.questionId === question.id,
                      ) && (
                        <div>
                          <MapPopup
                            questionName={question.questionName}
                            initialGeometries={assessmentGeometries.filter(
                              (geo) => geo.questionId === question.id,
                            )}
                          ></MapPopup>
                        </div>
                      )}
                    </div>
                  );
                })}
                {category.calculations.length > 0 && (
                  <div>
                    <h5>Calculos:</h5>
                    <ul className="list-disc p-3">
                      {category.calculations.map((calculation) => {
                        return (
                          <li key={calculation.id}>
                            <span>{calculation.name + ": "} </span>
                            {calculation.type === "SUM" && (
                              <span>{calculateSum(calculation)}</span>
                            )}
                            {calculation.type === "AVERAGE" && (
                              <span>{calculateAverage(calculation)}</span>
                            )}
                            {calculation.type === "PERCENTAGE" && (
                              <div>{calculatePercentages(calculation)}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                {category.subcategories.map((subcategory) => {
                  return (
                    <div key={subcategory.id}>
                      <span className="text-xl font-bold">
                        {subcategory.subcategoryName}
                      </span>

                      {subcategory.questions.map((question) => {
                        return (
                          <div key={question.id} className="my-4 flex flex-col">
                            <span className="font-bold">
                              {question.questionName}
                            </span>

                            {question.responses.length === 0 ?
                              <span>SEM RESPOSTA</span>
                            : question.responses.map((response) => {
                                return (
                                  <div
                                    className="flex gap-1"
                                    key={`${question.id}-${response.text}`}
                                  >
                                    {question.type === "OPTIONS" &&
                                      (question.optionType === "RADIO" ?
                                        <RadioButton
                                          disabled
                                          checked={response.frequency !== 0}
                                        />
                                      : <Checkbox
                                          disabled
                                          checked={response.frequency !== 0}
                                        />)}

                                    <span>{response.text}</span>
                                  </div>
                                );
                              })
                            }
                            {assessmentGeometries?.some(
                              (geo) => geo.questionId === question.id,
                            ) && (
                              <div>
                                <MapPopup
                                  questionName={question.questionName}
                                  initialGeometries={assessmentGeometries.filter(
                                    (geo) => geo.questionId === question.id,
                                  )}
                                ></MapPopup>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            );
          })}
          <Button className="w-fit">
            <Link
              href={`/admin/parks/${assessment.locationId}/evaluation/${assessment.formId}/${assessment.id}`}
            >
              Editar avaliação
            </Link>
          </Button>
        </ul>
      )}
    </div>
  );
};

const AssessmentsWithResponsesList = ({
  assessments,
}: {
  assessments: AssessmentsWithResposes;
}) => {
  const { setHelperCard } = useHelperCard();
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
  return (
    <div className="h-full">
      <h3 className="text-2xl font-semibold">Avaliações</h3>
      {assessments.assessments.map((assessment) => (
        <AssessmentComponent
          key={assessment.id}
          assessment={assessment}
          assessmentGeometries={assessment.geometries}
        />
      ))}
    </div>
  );
};

export { AssessmentsWithResponsesList };
