"use server";

import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@auth/userUtil";
import { ResponseGeometry } from "@customTypes/assessments/geometry";
import { QuestionTypes } from "@prisma/client";
import { checkIfLoggedInUserHasAnyPermission } from "@serverOnly/checkPermission";
import { Coordinate } from "ol/coordinate";

interface ResponseToAdd {
  questionId: number;
  type: QuestionTypes;
  response?: string[];
}
interface ResponseToUpdate {
  responseId: number[];
  locationId: number;
  formId: number;
  questionId: number;
  type: QuestionTypes;
  value: string[];
}

const _addResponses = async (
  assessmentId: number,
  responses: ResponseToAdd[],
  geometriesByQuestion: {
    questionId: number;
    geometries: ResponseGeometry[];
  }[],
  endAssessment: boolean,
) => {
  try {
    await checkIfLoggedInUserHasAnyPermission({
      roles: ["ASSESSMENT_EDITOR", "ASSESSMENT_MANAGER"],
    });
  } catch (e) {
    return {
      statusCode: 401,
    };
  }
  const user = await getSessionUser();
  const assessment = await prisma.assessment.findUnique({
    where: {
      id: assessmentId,
    },
    select: {
      userId: true,
    },
  });
  if (!assessment || !user) {
    return {
      statusCode: 404,
    };
  }
  if (user.id !== assessment?.userId) {
    try {
      await checkIfLoggedInUserHasAnyPermission({
        roles: ["ASSESSMENT_MANAGER"],
      });
    } catch (e) {
      return { statusCode: 401 };
    }
  }
  const responsesTextNumeric = responses.filter(
    (response) => response.type === "WRITTEN",
  );
  const responsesOption = responses.filter(
    (response) => response.type === "OPTIONS",
  );
  try {
    await prisma.assessment.update({
      where: {
        id: assessmentId,
      },
      data: {
        endDate: endAssessment ? new Date() : null,
        response: {
          upsert: responsesTextNumeric.map((response) => ({
            where: {
              assessmentId_questionId: {
                assessmentId,
                questionId: response.questionId,
              },
            },
            update: {
              response: response.response ? response.response[0] : undefined,
            },
            create: {
              type: response.type,
              response: response.response ? response.response[0] : undefined,
              user: {
                connect: {
                  id: user.id,
                },
              },
              question: {
                connect: {
                  id: response.questionId,
                },
              },
            },
          })),
        },
      },
    });
    const existingResponseOptions = await prisma.responseOption.findMany({
      where: {
        assessmentId,
      },
    });
    for (const currentResponseOption of responsesOption) {
      const existingResponseOptionsToCurrentQuestion =
        existingResponseOptions.filter(
          (responseOption) =>
            responseOption.questionId === currentResponseOption.questionId,
        );

      if (currentResponseOption.response?.includes("null")) {
        if (existingResponseOptionsToCurrentQuestion.length === 0) {
          await prisma.responseOption.create({
            data: {
              user: {
                connect: { id: user.id },
              },
              question: {
                connect: { id: currentResponseOption.questionId },
              },
              assessment: {
                connect: { id: assessmentId },
              },
            },
          });
        } else {
          await prisma.responseOption.updateMany({
            where: {
              assessmentId,
              questionId: currentResponseOption.questionId,
              userId: user.id,
            },
            data: {
              optionId: null,
            },
          });
        }
      } else {
        const optionIds =
          currentResponseOption.response?.map((id) => Number(id)) || [];

        for (let i = 0; i < optionIds.length; i++) {
          const optionId = optionIds[i];

          if (i < existingResponseOptionsToCurrentQuestion.length) {
            const currentExistingResponseOptionsToCurrentQuestion =
              existingResponseOptionsToCurrentQuestion[i];
            if (currentExistingResponseOptionsToCurrentQuestion) {
              await prisma.responseOption.update({
                where: {
                  id: currentExistingResponseOptionsToCurrentQuestion.id,
                },
                data: {
                  option: {
                    connect: { id: optionId },
                  },
                },
              });
            }
          } else {
            await prisma.responseOption.create({
              data: {
                user: {
                  connect: { id: user.id },
                },
                question: {
                  connect: { id: currentResponseOption.questionId },
                },
                assessment: {
                  connect: { id: assessmentId },
                },
                option: {
                  connect: { id: optionId },
                },
              },
            });
          }
        }

        if (
          existingResponseOptionsToCurrentQuestion.length > optionIds.length
        ) {
          const excessResponseOptions =
            existingResponseOptionsToCurrentQuestion.slice(optionIds.length);
          await prisma.responseOption.updateMany({
            where: {
              id: {
                in: excessResponseOptions.map(
                  (excessResponseOption) => excessResponseOption.id,
                ),
              },
            },
            data: {
              optionId: null,
            },
          });
        }
      }
    }
  } catch (e) {
    return {
      statusCode: 500,
    };
  }
  //GEOMETRIES

  for (const geometryByQuestion of geometriesByQuestion) {
    const { questionId, geometries } = geometryByQuestion;
    const wktGeometries = geometries
      .map((geometry) => {
        const { type, coordinates } = geometry;
        if (type === "Point") {
          const [longitude, latitude] = coordinates as number[];
          return `POINT(${longitude} ${latitude})`;
        } else if (type === "Polygon") {
          const polygonCoordinates = (coordinates as Coordinate[][])
            .map((ring) =>
              ring
                .map(([longitude, latitude]) => `${longitude} ${latitude}`)
                .join(", "),
            )
            .join("), (");

          return `POLYGON((${polygonCoordinates}))`;
        }
      })
      .join(", ");
    try {
      if (wktGeometries.length !== 0) {
        const geoText = `GEOMETRYCOLLECTION(${wktGeometries})`;
        await prisma.$executeRaw`
      INSERT INTO question_geometry (assessment_id, question_id, geometry)
      VALUES (${assessmentId}, ${questionId}, ST_GeomFromText(${geoText}, 4326))
      ON CONFLICT (assessment_id, question_id)
      DO UPDATE SET geometry = ST_GeomFromText(${geoText}, 4326)
    `;
      } else {
        await prisma.$executeRaw`
      INSERT INTO question_geometry (assessment_id, question_id, geometry)
      VALUES (${assessmentId}, ${questionId}, NULL)
      ON CONFLICT (assessment_id, question_id)
      DO UPDATE SET geometry = NULL
    `;
      }
    } catch (e) {
      return { statusCode: 500 };
    }
  }
  return {
    statusCode: 201,
  };
};

export { _addResponses };

export { type ResponseToUpdate };
