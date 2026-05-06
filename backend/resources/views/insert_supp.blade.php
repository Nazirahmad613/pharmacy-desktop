<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فرم ثبت دارو</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            direction: rtl;
            background: #f3f4f6;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
        }
        .form-container {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.1);
            width: 350px;
        }
        h2 {
            text-align: center;
            color: #333;
        }
        label {
            font-weight: bold;
            display: block;
            margin-top: 10px;
            color: #555;
        }
        input, select {
            width: 100%;
            padding: 10px;
            margin-top: 5px;
            border: 1px solid #ccc;
            border-radius: 5px;
            font-size: 14px;
        }
        button {
            width: 100%;
            padding: 10px;
            margin-top: 15px;
            background-color: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background-color: #218838;
        }
        .success-message {
            text-align: center;
            color: green;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h2>فرم ثبت دارو</h2>

        @if(session('success'))
            <p class="success-message">{{ session('success') }}</p>
        @endif

        <form action="{{ route('insert_supp') }}" method="POST">
            @csrf

 
            <label for="name">نام شرکت :</label>
            <input id="name" type="text" name="name" required>
            
            <label for="cont_person">شخص ارتباطی:</label>
            <input id="cont_person" type="text" name="cont_person" required>
            
            <label for="phone_num">شماره تماس:</label>
            <input id="phone_num" type="number" name="phone_num" required>

            <label for="email">ایمل آدرس:</label>
            <input id="email" type="text" name="email" required>

            <label for="address">آدرس شرکت:</label>
            <input id="address" type="text" name="address" required>

            <button type="submit">ثبت</button>
        </form>
    </div>


    <script>
        document.querySelector("form").addEventListener("submit", function(event) {
            let supplierSelect = document.getElementById("supplier_id");
            if (!supplierSelect.value) {
                alert("لطفاً یک شرکت تأمین‌کننده را انتخاب کنید.");
                event.preventDefault();
            }
        });
    </script>
 
</body>
</html>
 
