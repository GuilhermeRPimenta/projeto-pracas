import { OrdersObj } from "@app/admin/users/usersTable";
import { getSessionUser } from "@auth/userUtil";
import { prisma } from "@lib/prisma";
import { Role } from "@prisma/client";

const getUserAuthInfo = async (
  userId: string | undefined | null,
): Promise<{
  image: string | null;
  id: string;
  email: string;
  username: string | null;
  active: boolean;
  roles: Role[];
} | null> => {
  if (!userId) return null;
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.id !== userId) return null;
  try {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        username: true,
        image: true,
        active: true,
        roles: true,
      },
    });
    return user;
  } catch (e) {
    return null;
  }
};

const getUsers = async (
  page: number,
  take: number,
  search: string | null | undefined,
  orders: OrdersObj,
  activeUsersFilter: boolean,
) => {
  try {
    const pageToSkipCalc = page > 0 ? page : 1;
    const skip = (pageToSkipCalc - 1) * take;
    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        orderBy: Object.keys(orders)
          .filter((key) => orders[key as keyof OrdersObj] !== "none")
          .map((key) => ({ [key]: orders[key as keyof OrdersObj] })),
        where: {
          active: activeUsersFilter,
          ...(search ?
            {
              OR: [
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  username: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
        },
      }),
      prisma.user.count({
        where: {
          active: activeUsersFilter,
          ...(search ?
            {
              OR: [
                {
                  email: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  username: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  name: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
              ],
            }
          : {}),
        },
      }),
    ]);
    return {
      statusCode: 200,
      users,
      totalUsers,
    };
  } catch (e) {
    return { statusCode: 500, users: null, totalUsers: null };
  }
};

const getUserContentAmount = async (userId: string) => {
  try {
    const [assessments, tallys] = await Promise.all([
      prisma.assessment.count({
        where: {
          userId,
        },
      }),
      prisma.tally.count({
        where: {
          userId,
        },
      }),
    ]);
    return { statusCode: 200, assessments, tallys };
  } catch (e) {
    return { statusCode: 500, assessments: null, tallys: null };
  }
};

export { getUserAuthInfo, getUsers, getUserContentAmount };
