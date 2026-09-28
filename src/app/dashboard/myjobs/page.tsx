import { Metadata } from "next";

import {
  getJobSourceList,
  getJobSourcesInUse,
  getStatusList,
} from "@/actions/job.actions";
import JobsContainer from "@/components/myjobs/JobsContainer";
import { getAllCompanies } from "@/actions/company.actions";
import { getAllJobTitles } from "@/actions/jobtitle.actions";
import {
  getAllJobLocations,
  getJobLocationsInUse,
} from "@/actions/jobLocation.actions";
import { getAllTags } from "@/actions/tag.actions";

export const metadata: Metadata = {
  title: "My Jobs | JobSync",
};

async function MyJobs() {
  const [
    statuses,
    companies,
    titles,
    locations,
    sources,
    tags,
    filterLocations,
    filterSources,
  ] = await Promise.all([
    getStatusList(),
    getAllCompanies(),
    getAllJobTitles(),
    getAllJobLocations(),
    getJobSourceList(),
    getAllTags(),
    getJobLocationsInUse(),
    getJobSourcesInUse(),
  ]);
  return (
    <div className="col-span-3">
      <JobsContainer
        companies={companies}
        titles={titles}
        locations={locations}
        sources={sources}
        statuses={statuses}
        tags={tags ?? []}
        filterLocations={filterLocations ?? []}
        filterSources={filterSources ?? []}
      />
    </div>
  );
}

export default MyJobs;
