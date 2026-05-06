 
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
    
        {{ session('mes') }}
    <div class="form-container">
        <h2>فرم ثبت دارو</h2>

        @if(session('success'))
            <p class="success-message">{{ session('success') }}</p>
        @endif

        <form action="{{ route('medications.store') }}" method="POST">
            @csrf

  <!-- انتخاب آی‌دی شرکت تأمین‌کننده -->
  <select name="supplier_id" id="supplier_id" required>
    <option value="">انتخاب کنید</option>
    @foreach($suppliers as $supplier)
        <option value="{{ $supplier->supplier_id }}">{{ $supplier->name }}</option>
    @endforeach
</select>
            <label for="gen_name">نام دوا :</label>
            <input id="gen_name" type="text" name="gen_name" required>
            
            <label for="dosage">مقدار مصرف:</label>
            <input id="dosage" type="text" name="dosage" required>
            
            <label for="unit_price">قیمت  خرید فی قطی:</label>
            <input id="unit_price" type="number" name="unit_price" required>

            <label for="quantity">تعداددوای خریده:</label>
            <input id="quantity" type="number" name="quantity" required>

            <label for="exp_date">تاریخ انقضا: دوا</label>
            <input id="exp_date" type="date" name="exp_date" required>

            <button type="submit">ثبت</button>
        </form>
    </div>
     
   
 
</body>
</html>
