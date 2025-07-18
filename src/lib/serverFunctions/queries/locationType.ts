"use server";

import { prisma } from "@/lib/prisma";

type LocationTypes = Awaited<ReturnType<typeof fetchLocationTypes>>;

const fetchLocationTypes = async () => {
  try {
    const locationTypes = await prisma.locationType.findMany();
    return {
      statusCode: 200,
      message: "Location types fetch successful",
      types: locationTypes,
    };
  } catch (e) {
    return {
      statusCode: 500,
      message: "Error during category fetch",
      types: [],
    };
  }
};

export { fetchLocationTypes };
export { type LocationTypes };
