import { Metadata } from "next";
import MatchResultsContainer from "@/components/matchResults/MatchResultsContainer";

export const metadata: Metadata = {
  title: "Match Results | JobSync",
};

function MatchResultsPage() {
  return (
    <div className="col-span-3">
      <MatchResultsContainer />
    </div>
  );
}

export default MatchResultsPage;
