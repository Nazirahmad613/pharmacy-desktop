 
import { useState } from "react";
import { toast } from "react-toastify";
import MainLayoutsup from "../../../../components/MainLayoutsup";

const SupplierForm = () => {
    const [formData, setFormData] = useState({
        name: "",
        cont_person: "",
        phone_num: "",
        email: "",
        address: ""
    });
    const [message, setMessage] = useState("");

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            const token = localStorage.getItem("token");

            const response = await fetch("http://localhost:8000/api/suppliers", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                   
                      "Authorization": `Bearer ${localStorage.getItem("token")}`, // ⭐ اضافه شد
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error("REQUEST_FAILED");
            }

            await response.json();

            toast.success("✅ معلومات سپلایر با موفقیت ثبت شد", {
                position: "top-right",
                autoClose: 3000,
                theme: "dark",
            });

            setFormData({
                name: "",
                cont_person: "",
                phone_num: "",
                email: "",
                address: ""
            });

        } catch (error) {
            setMessage("خطا در ثبت اطلاعات (احراز هویت انجام نشده)");
        }
    };

    return (
        <MainLayoutsup>
        <div className="custom-form">
            <div className="form-wrapper">
                <div className="form-container">
                    <h2 align="center">فورم ثبت شرکت سازنده دارو</h2>
                    {message && <p className="error-message">{message}</p>}

                    <form onSubmit={handleSubmit}>
                        <label>نام شرکت سازنده</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required />

                        <label>شخص ارتباطی</label>
                        <input type="text" name="cont_person" value={formData.cont_person} onChange={handleChange} required />

                        <label>شماره تماس</label>
                        <input type="number" name="phone_num" value={formData.phone_num} onChange={handleChange} required />

                        <label>ایمیل آدرس</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} required />

                        <label>آدرس</label>
                        <input type="text" name="address" value={formData.address} onChange={handleChange} required />

                        <button type="submit">ثبت</button>
                    </form>
                </div>
            </div>
        </div>
        </MainLayoutsup>   
    );
};


export default SupplierForm;
