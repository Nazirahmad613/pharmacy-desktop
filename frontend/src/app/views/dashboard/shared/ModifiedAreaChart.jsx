import ReactEcharts from "echarts-for-react";
import merge from "lodash/merge";
import { useTranslation } from "react-i18next";

const defaultOption = {
  grid: { top: 16, left: 36, right: 16, bottom: 32 },
  tooltip: {
    show: true,
    trigger: "axis",
    axisPointer: { type: "cross", lineStyle: { opacity: 0 } },
    crossStyle: { color: "#000" },
    formatter: (params) => {
      const { t } = useTranslation();
      let tooltipText = `${t("tooltip_title")}<br/>`;
      params.forEach((item) => {
        tooltipText += `${item.marker} ${item.seriesName}: ${item.value}<br/>`;
      });
      return tooltipText;
    }
  },
  series: [{ smooth: true, lineStyle: { width: 2, color: "#fff" } }],
  xAxis: {
    show: true,
    type: "category",
    showGrid: false,
    boundaryGap: false,
    axisLabel: { color: "#ccc", margin: 20 },
    axisLine: { show: false },
    axisTick: { show: false }
  },
  yAxis: {
    min: 10,
    max: 60,
    type: "value",
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: "#ccc", margin: 20, fontSize: 13, fontFamily: "roboto" },
    splitLine: { show: true, lineStyle: { color: "rgba(255, 255, 255, .1)" } }
  },
  color: [
    {
      type: "linear",
      x: 0,
      y: 0,
      x2: 0,
      y2: 1,
      global: false,
      colorStops: [
        { offset: 0, color: "rgba(255,255,255,0.3)" },
        { offset: 1, color: "rgba(255,255,255,0)" }
      ]
    }
  ]
};

const ModifiedAreaChart = ({ height, option }) => {
  const { t } = useTranslation();

  const translatedOption = merge({}, defaultOption, option, {
    tooltip: {
      formatter: (params) => {
        let tooltipText = `${t("tooltip_title")}<br/>`;
        params.forEach((item) => {
          tooltipText += `${item.marker} ${t(item.seriesName)}: ${item.value}<br/>`;
        });
        return tooltipText;
      }
    },
    xAxis: {
      name: t("x_axis"),
      nameTextStyle: { color: "#ccc" }
    },
    yAxis: {
      name: t("y_axis"),
      nameTextStyle: { color: "#ccc" }
    }
  });

  return <ReactEcharts style={{ height: height }} option={translatedOption} />;
};

export default ModifiedAreaChart;
