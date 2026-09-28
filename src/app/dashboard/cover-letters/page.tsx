import { Metadata } from "next";
import GeneratedCoverLettersContainer from "@/components/coverLetters/GeneratedCoverLettersContainer";

export const metadata: Metadata = {
  title: "Cover Letters | JobSync",
};

function CoverLettersPage() {
  return (
    <div className="col-span-3">
      <GeneratedCoverLettersContainer />
    </div>
  );
}

export default CoverLettersPage;
