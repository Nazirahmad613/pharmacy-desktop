 
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
            body {
    font-family: Arial, sans-serif;
    direction: rtl;
    background: url('1.jpg') no-repeat center center fixed;
    background-size: cover;
    display: flex;
    justify-content: center;
    align-items: center;    
    height: 100vh;
}

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
    
        {{ session('success')}}
    <div class="form-container">
        <h2>فرم ثبت معلومات داکتر</h2>

        @if(session('success'))
            <p class="success-message">{{ session('success') }}</p>
        @endif

        <form action="{{ route('doctor_store') }}" method="POST">
            @csrf
      <label for="doc_name">نام داکتر:</label>
            <input id="doc_name" type="text" name="doc_name" required>
            
            <label for="doc_last_name">تخلص</label>
            <input id="doc_last_name" type="text" name="doc_last_name" required>

            <label for="doc_section"> بخش مربوطه </label>
            <input id="doc_section" type="text" name="doc_section" required>

            <label for="doc_phone">شماره تماس</label>
            <input id="doc_phone" type="number" name="doc_phone" required>

             
            <button type="submit">ثبت</button>
        </form>
    </div>
     
   
 
</body>
</html>
