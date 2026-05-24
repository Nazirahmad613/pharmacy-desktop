import useSettings from "app/hooks/useSettings";

export default function FirstLogo({ className }) {
  const { settings } = useSettings();

  return (
    <div className={className}>
    
      <h2 style={{ textAlign: "center", marginBottom: "10px" }}>
        شفاخانه معالجوی الفلاح
      </h2>

      <img
        src={`${import.meta.env.BASE_URL}images/flogo.png`}
        alt="New Logo"
        width="150px"
        height="auto"
        style={{ display: "block", margin: "0 auto" }}
      />

    </div>
  );
}