export const accountStyles = {
  container: {
    direction: "rtl",
    p: 3,
  },
  header: {
    textAlign: "center",
    mb: 3,
    fontWeight: "bold",
    color: "#1a237e",
  },
  searchBox: {
    minWidth: 250,
  },
  selectBox: {
    minWidth: 200,
  },
  paginationButton: (active) => ({
    borderRadius: "8px",
    fontWeight: active ? "bold" : "normal",
  }),
};