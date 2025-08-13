import { render, screen } from "@testing-library/react";
import StatsOverview from "../../../components/dashboard/StatsOverview";

declare global {
  // suppress React 18 act warnings in tests
  // eslint-disable-next-line no-var
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

global.IS_REACT_ACT_ENVIRONMENT = true;

describe("StatsOverview", () => {
  it("renders four stats cards", () => {
    render(
      <StatsOverview
        stats={{ users: 5, assets: 10, models: 4, totalSize: 1024 * 1024 }}
        storageChartData={{ labels: [], datasets: [] }}
        growthChartData={{ labels: [], datasets: [] }}
        formatBytes={(b) => `${b} bytes`}
        onRefresh={() => {}}
        refreshing={false}
      />,
    );

    expect(screen.getByText("Total Users")).toBeInTheDocument();
    expect(screen.getByText("Total Assets")).toBeInTheDocument();
    expect(screen.getByText("3D Models")).toBeInTheDocument();
    expect(screen.getByText("Storage Used")).toBeInTheDocument();
  });
});
