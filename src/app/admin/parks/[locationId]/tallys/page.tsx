import TallyPage from "@/app/admin/parks/[locationId]/tallys/tallyListPage";
import { auth } from "@lib/auth/auth";
import { searchLocationNameById } from "@queries/location";
import { fetchTallysByLocationId } from "@queries/tally";
import { redirect } from "next/navigation";

const Tallys = async (props: { params: Promise<{ locationId: string }> }) => {
  const session = await auth();
  if (!session?.user) redirect("/error");
  const params = await props.params;
  const { tallys } = await fetchTallysByLocationId(Number(params.locationId));
  const { locationName } = await searchLocationNameById(
    parseInt(params.locationId),
  );

  let endedTallys;
  let ongoingTallys;
  if (tallys) {
    endedTallys = tallys.filter((tally) => tally.endDate);
    ongoingTallys = tallys.filter((tally) => !tally.endDate);
  }

  return (
    <TallyPage
      locationId={params.locationId}
      locationName={locationName ?? "[ERRO]"}
      tallys={endedTallys}
      ongoingTallys={ongoingTallys}
      userId={session?.user.id}
    />
  );
};

export default Tallys;
