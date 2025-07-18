"use server";

import { prisma } from "@/lib/prisma";
import { checkIfLoggedInUserHasAnyPermission } from "@serverOnly/checkPermission";
import { revalidateTag } from "next/cache";

const removePolygon = async (id: number) => {
  try {
    await checkIfLoggedInUserHasAnyPermission({ roles: ["PARK_MANAGER"] });
  } catch (e) {
    return { statusCode: 401 };
  }
  if (!id) {
    return { statusCode: 500 };
  }
  try {
    await prisma.$executeRaw`
      UPDATE location
      SET 
        polygon = NULL,
        polygon_area = NULL
      WHERE id = ${id};
    `;
  } catch (e) {
    return { statusCode: 500 };
  }

  revalidateTag("location");

  return { statusCode: 200 };
};

export { removePolygon };
