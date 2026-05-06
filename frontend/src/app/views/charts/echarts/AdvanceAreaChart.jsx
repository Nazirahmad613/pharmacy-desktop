import ReactEcharts from "echarts-for-react";
import merge from "lodash/merge";
import { useTranslation } from "react-i18next";

const defaultOption = (t) => ({
  grid: { top: 16, left: 36, right: 16, bottom: 32 },

  tooltip: {
    show: true,
    trigger: "axis",
    crossStyle: { color: "#000" },
    axisPointer: { type: "cross", lineStyle: { opacity: 0 } },
    formatter: (params) => {
      let tooltipText = `${t("tooltip_value")}: ${params[0].value}`;
      return tooltipText;
    }
  },

  series: [{ smooth: true, lineStyle: { width: 2, color: "#fff" } }],

  xAxis: {
    show: true,
    showGrid: false,
    type: "category",
    boundaryGap: false,
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#ccc", margin: 20 }
  },

  yAxis: {
    min: 10,
    max: 60,
    type: "value",
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: {
      margin: 20,
      fontSize: 13,
      color: "#ccc",
      fontFamily: "roboto",
      formatter: (value) => `${value} ${t("y_axis_unit")}`
    },
    splitLine: { show: true, lineStyle: { color: "rgba(255, 255, 255, .1)" } }
  }
});

export default function AdvanceAreaChart({ height, option }) {
  const { t } = useTranslation();

  return <ReactEcharts style={{ height }} option={merge({}, defaultOption(t), option)} />;
}
