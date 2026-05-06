import ReactEcharts from "echarts-for-react";
import { useTheme } from "@mui/material/styles";
import { useTranslation } from "react-i18next";

export default function DoughnutChart({ height, color = [] }) {
  const theme = useTheme();
  const { t } = useTranslation();

  const option = {
    legend: {
      bottom: 0,
      show: true,
      itemGap: 20,
      icon: "circle",
      textStyle: { color: theme.palette.text.secondary, fontSize: 13, fontFamily: "roboto" }
    },
    tooltip: { 
      show: true, 
      trigger: "item", 
      formatter: `{a} <br/>{b}: {c} (${t("percentage")} {d}%)` 
    },
    xAxis: [{ axisLine: { show: false }, splitLine: { show: false } }],
    yAxis: [{ axisLine: { show: false }, splitLine: { show: false } }],

    series: [
      {
        name: t("traffic_rate"),
        type: "pie",
        hoverOffset: 5,
        radius: ["45%", "72.55%"],
        center: ["50%", "50%"],
        avoidLabelOverlap: false,
        stillShowZeroSum: false,
        labelLine: { show: false },
        label: {
          show: false,
          fontSize: 13,
          formatter: "{a}",
          position: "center",
          fontFamily: "roboto",
          color: theme.palette.text.secondary
        },
        emphasis: {
          label: {
            show: true,
            fontSize: "14",
            padding: 4,
            fontWeight: "normal",
            formatter: `{b} (${t("percentage")} {d}%)`
          },
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: "rgba(0, 0, 0, 0.5)"
          }
        },
        data: [
          { value: 65, name: t("google") },
          { value: 20, name: t("facebook") },
          { value: 15, name: t("others") }
        ]
      }
    ]
  };

  return <ReactEcharts style={{ height }} option={{ ...option, color: [...color] }} />;
}
