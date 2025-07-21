"use server";

import { prisma } from "@/lib/prisma";
import { locationSchema } from "@/lib/zodValidators";
import { BrazilianStates, Location } from "@prisma/client";
import { checkIfLoggedInUserHasAnyPermission } from "@serverOnly/checkPermission";
import {
  addPolygon,
  addPolygonFromWKT,
  getPolygonsFromShp,
} from "@serverOnly/geometries";
import { revalidateTag } from "next/cache";
import { z } from "zod";

interface LocationWithCity extends Location {
  hasGeometry: boolean;
  type: {
    id: number;
    name: string;
  } | null;
  category: {
    id: number;
    name: string;
  } | null;
  narrowAdministrativeUnit: {
    id: number;
    name: string;
    city: {
      name: string;
      state: BrazilianStates;
    } | null;
  } | null;
  intermediateAdministrativeUnit: {
    id: number;
    name: string;
    city: {
      name: string;
      state: BrazilianStates;
    } | null;
  } | null;
  broadAdministrativeUnit: {
    id: number;
    name: string;
    city: {
      name: string;
      state: BrazilianStates;
    } | null;
  } | null;
}

const _deleteLocation = async (id: number) => {
  try {
    await checkIfLoggedInUserHasAnyPermission({ roles: ["PARK_MANAGER"] });
  } catch (e) {
    return { statusCode: 401, formNamesAndVersions: null, itemsCount: null };
  }
  try {
    const location = await prisma.location.findUnique({
      where: {
        id,
      },
      include: {
        assessment: {
          select: {
            form: {
              select: {
                name: true,
                version: true,
              },
            },
          },
        },
        _count: {
          select: { tally: true, assessment: true },
        },
      },
    });
    if (!location) {
      return { statusCode: 404, formNamesAndVersions: null, itemsCount: null };
    }

    if (location.assessment.length > 0) {
      const formNamesAndVersions = new Map<string, Set<number>>();
      location.assessment.forEach((assessment) => {
        if (!formNamesAndVersions.has(assessment.form.name)) {
          formNamesAndVersions.set(assessment.form.name, new Set());
        }
        const versionSet = formNamesAndVersions.get(assessment.form.name);
        versionSet?.add(assessment.form.version);
      });
      return {
        statusCode: 409,
        formNamesAndVersions,
        itemsCount: location._count,
      };
    }
    await prisma.location.delete({
      where: {
        id,
      },
    });
    revalidateTag("location");
    return { statusCode: 200, formNamesAndVersions: null, itemsCount: null };
  } catch (err) {
    return { statusCode: 500, formNamesAndVersions: null, itemsCount: null };
  }
};

const _updateLocation = async (
  prevState: { statusCode: number; message: string },
  formData: FormData,
) => {
  try {
    await checkIfLoggedInUserHasAnyPermission({ roles: ["PARK_MANAGER"] });
  } catch (e) {
    return { statusCode: 401, message: "Invalid permission" };
  }
  let parseId;
  try {
    parseId = z.coerce
      .number()
      .int()
      .finite()
      .nonnegative()
      .parse(formData.get("locationId"));
  } catch (e) {
    return {
      statusCode: 400,
      message: "Invalid id",
    };
  }

  let locationToUpdate;
  const narrowAdministrativeUnitName = formData.get("narrowAdministrativeUnit");
  const intermediateAdministrativeUnitName = formData.get(
    "intermediateAdministrativeUnit",
  );
  const broadAdministrativeUnitName = formData.get("broadAdministrativeUnit");

  const cityName = formData.get("city");
  const stateName = formData.get("state") as string;
  if (cityName && stateName === "NONE") {
    return { statusCode: 400, message: "City sent without state" };
  }
  try {
    locationToUpdate = locationSchema.parse({
      name: formData.get("name"),
      popularName: formData.get("popularName"),
      firstStreet: formData.get("firstStreet"),
      secondStreet: formData.get("secondStreet"),
      creationYear: formData.get("creationYear"),
      lastMaintenanceYear: formData.get("lastMaintenanceYear"),
      overseeingMayor: formData.get("overseeingMayor"),
      legislation: formData.get("legislation"),
      legalArea: formData.get("legalArea"),
      usableArea: formData.get("usableArea"),
      incline: formData.get("incline"),
      notes: formData.get("notes"),
      isPark: formData.get("isPark") === "true",
      inactiveNotFound: formData.get("inactiveNotFound") === "true",
    });
  } catch (e) {
    return {
      statusCode: 400,
      message: "Invalid data",
    };
  }
  try {
    await prisma.$transaction(async (prisma) => {
      const city = await prisma.city.upsert({
        where: {
          name_state: {
            name: cityName as string,
            state: stateName as BrazilianStates,
          },
        },
        update: {},
        create: {
          name: cityName as string,
          state: stateName as BrazilianStates,
        },
      });
      let narrowAdministrativeUnitId: number | null = null;
      let intermediateAdministrativeUnitId: number | null = null;
      let broadAdministrativeUnitId: number | null = null;
      if (narrowAdministrativeUnitName) {
        const narrowAdministrativeUnit =
          await prisma.narrowAdministrativeUnit.upsert({
            where: {
              cityId_narrowUnitName: {
                cityId: city.id,
                name: narrowAdministrativeUnitName as string,
              },
            },
            update: {},
            create: {
              name: narrowAdministrativeUnitName as string,
              city: {
                connect: { id: city.id },
              },
            },
          });
        narrowAdministrativeUnitId = narrowAdministrativeUnit.id;
      }
      if (intermediateAdministrativeUnitName) {
        const intermediateAdministrativeUnit =
          await prisma.intermediateAdministrativeUnit.upsert({
            where: {
              cityId_intermediateUnitName: {
                cityId: city.id,
                name: intermediateAdministrativeUnitName as string,
              },
            },
            update: {},
            create: {
              name: intermediateAdministrativeUnitName as string,
              city: {
                connect: { id: city.id },
              },
            },
          });
        intermediateAdministrativeUnitId = intermediateAdministrativeUnit.id;
      }
      if (broadAdministrativeUnitName) {
        const broadAdministrativeUnit =
          await prisma.broadAdministrativeUnit.upsert({
            where: {
              cityId_broadUnitName: {
                cityId: city.id,
                name: broadAdministrativeUnitName as string,
              },
            },
            update: {},
            create: {
              name: broadAdministrativeUnitName as string,
              city: {
                connect: { id: city.id },
              },
            },
          });
        broadAdministrativeUnitId = broadAdministrativeUnit.id;
      }
      if (
        !narrowAdministrativeUnitId &&
        !intermediateAdministrativeUnitId &&
        !broadAdministrativeUnitId
      ) {
        throw new Error("No administrative unit created or connect");
      }

      const category = formData.get("category");
      const categoryValue =
        category === "" || category === null ? null : String(category);
      const type = formData.get("type");
      const typeValue = category === "" || type === null ? null : String(type);
      let locationTypeId: number | null = null;
      if (typeValue) {
        const locationType = await prisma.locationType.upsert({
          where: {
            name: typeValue,
          },
          update: {},
          create: {
            name: typeValue,
          },
        });
        locationTypeId = locationType.id;
      }
      let locationCategoryId: number | null = null;
      if (categoryValue) {
        const locationCategory = await prisma.locationCategory.upsert({
          where: {
            name: categoryValue,
          },
          update: {},
          create: {
            name: categoryValue,
          },
        });
        locationCategoryId = locationCategory.id;
      }

      await prisma.location.update({
        where: {
          id: parseId,
        },
        data: {
          ...locationToUpdate,
          narrowAdministrativeUnitId,
          intermediateAdministrativeUnitId,
          broadAdministrativeUnitId,
          typeId: locationTypeId,
          categoryId: locationCategoryId,
        },
      });
    });

    const shpFile = formData.get("file");
    if (!shpFile) {
      revalidateTag("location");
      return { statusCode: 200, message: "Location updated" };
    }
    try {
      const WKT = await getPolygonsFromShp(formData.get("file") as File);
      WKT && (await addPolygonFromWKT(WKT, parseId, prisma));
      revalidateTag("location");
      return { statusCode: 200, message: "Location updated" };
    } catch (e) {
      return { statusCode: 400, message: "Error during polygon save" };
    }
  } catch (e) {
    return { statusCode: 400, message: "Database error" };
  }
};

const _createLocation = async (
  _curStatus: { statusCode: number; message: string },
  formData: FormData,
) => {
  try {
    await checkIfLoggedInUserHasAnyPermission({ roles: ["PARK_MANAGER"] });
  } catch (e) {
    return { statusCode: 401, message: "Invalid permission" };
  }
  let location;
  try {
    location = locationSchema.parse({
      name: formData.get("name"),
      popularName: formData.get("popularName"),
      firstStreet: formData.get("firstStreet"),
      secondStreet: formData.get("secondStreet"),
      creationYear: formData.get("creationYear"),
      lastMaintenanceYear: formData.get("lastMaintenanceYear"),
      overseeingMayor: formData.get("overseeingMayor"),
      legislation: formData.get("legislation"),
      legalArea: formData.get("legalArea"),
      usableArea: formData.get("usableArea"),
      incline: formData.get("incline"),
      notes: formData.get("notes"),
      isPark: formData.get("isPark") === "true",
      inactiveNotFound: formData.get("inactiveNotFound") === "true",
    });
  } catch (err) {
    return { statusCode: 400, message: "Invalid data" };
  }

  const cityName = formData.get("city");
  const stateName = formData.get("state") as string;
  const narrowAdministrativeUnitName = formData.get("narrowAdministrativeUnit");
  const intermediateAdministrativeUnitName = formData.get(
    "intermediateAdministrativeUnit",
  );
  const broadAdministrativeUnitName = formData.get("broadAdministrativeUnit");

  let result;
  try {
    await prisma.$transaction(async (prisma) => {
      const city = await prisma.city.upsert({
        where: {
          name_state: {
            name: cityName as string,
            state: stateName as BrazilianStates,
          },
        },
        update: {},
        create: {
          name: cityName as string,
          state: stateName as BrazilianStates,
        },
      });
      let narrowAdministrativeUnitId: number | null = null;
      let intermediateAdministrativeUnitId: number | null = null;
      let broadAdministrativeUnitId: number | null = null;

      if (narrowAdministrativeUnitName) {
        const narrowAdministrativeUnit =
          await prisma.narrowAdministrativeUnit.upsert({
            where: {
              cityId_narrowUnitName: {
                cityId: city.id,
                name: narrowAdministrativeUnitName as string,
              },
            },
            update: {},
            create: {
              name: narrowAdministrativeUnitName as string,
              city: {
                connect: { id: city.id },
              },
            },
          });
        narrowAdministrativeUnitId = narrowAdministrativeUnit.id;
      }

      if (intermediateAdministrativeUnitName) {
        const intermediateAdministrativeUnit =
          await prisma.intermediateAdministrativeUnit.upsert({
            where: {
              cityId_intermediateUnitName: {
                cityId: city.id,
                name: intermediateAdministrativeUnitName as string,
              },
            },
            update: {},
            create: {
              name: intermediateAdministrativeUnitName as string,
              city: {
                connect: { id: city.id },
              },
            },
          });
        intermediateAdministrativeUnitId = intermediateAdministrativeUnit.id;
      }

      if (broadAdministrativeUnitName) {
        const broadAdministrativeUnit =
          await prisma.broadAdministrativeUnit.upsert({
            where: {
              cityId_broadUnitName: {
                cityId: city.id,
                name: broadAdministrativeUnitName as string,
              },
            },
            update: {},
            create: {
              name: broadAdministrativeUnitName as string,
              city: {
                connect: { id: city.id },
              },
            },
          });
        broadAdministrativeUnitId = broadAdministrativeUnit.id;
      }

      if (
        !narrowAdministrativeUnitId &&
        !intermediateAdministrativeUnitId &&
        !broadAdministrativeUnitId
      ) {
        throw new Error("No administrative unit created or connected");
      }
      const category = formData.get("category");
      const categoryValue =
        category === "" || category === null ? null : String(category);
      const type = formData.get("type");
      const typeValue = category === "" || type === null ? null : String(type);
      let locationTypeId: number | null = null;
      if (typeValue) {
        const locationType = await prisma.locationType.upsert({
          where: {
            name: typeValue,
          },
          update: {},
          create: {
            name: typeValue,
          },
        });
        locationTypeId = locationType.id;
      }
      let locationCategoryId: number | null = null;
      if (categoryValue) {
        const locationCategory = await prisma.locationCategory.upsert({
          where: {
            name: categoryValue,
          },
          update: {},
          create: {
            name: categoryValue,
          },
        });
        locationCategoryId = locationCategory.id;
      }
      result = await prisma.location.create({
        data: {
          ...location,
          narrowAdministrativeUnitId,
          intermediateAdministrativeUnitId,
          broadAdministrativeUnitId,
          typeId: locationTypeId,
          categoryId: locationCategoryId,
        },
      });
      // Após a criação da localização, adicionar os polígonos
      try {
        if (formData.get("featuresGeoJson")) {
          const featuresGeoJson = z
            .string()
            .parse(formData.get("featuresGeoJson"));

          await addPolygon(featuresGeoJson, result.id, prisma);
        }

        if (formData.get("file")) {
          const wkt = await getPolygonsFromShp(formData.get("file") as File);
          if (wkt) {
            await addPolygonFromWKT(wkt, result.id, prisma);
          }
        }
      } catch (err) {
        throw new Error("Error inserting polygon into database");
      }
      return { statusCode: 200, message: "Location created" };
    });
  } catch (err) {
    return { statusCode: 400, message: "Database error" };
  }

  revalidateTag("location");

  return { statusCode: 201, message: "locationCreated" };
};

const _editLocationPolygon = async (id: number, featuresGeoJson: string) => {
  try {
    await checkIfLoggedInUserHasAnyPermission({ roles: ["PARK_MANAGER"] });
  } catch (e) {
    return { statusCode: 401 };
  }
  try {
    await addPolygon(featuresGeoJson, id);
    //revalidatePath("/admin/map");
    return { statusCode: 201 };
  } catch (e) {
    return { statusCode: 500 };
  }
};

export {
  _deleteLocation,
  _updateLocation,
  _createLocation,
  _editLocationPolygon,
};

export type { LocationWithCity };
