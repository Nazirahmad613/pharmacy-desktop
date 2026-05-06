 
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
        <h2>فورم فروشات</h2>

        @if(session('save'))
            <p class="success-message">{{ session('save') }}</p>
        @endif

        <form action="{{ route('sales_store') }}" method="POST">
            @csrf
  
            <h3>انتخاب مشتری</h3> 
  <select name="customer_id" id="customer_id" required>
    <option value="">انتخاب کنید</option>
    @foreach($custom as $customer)
        <option value="{{ $customer->customer_id }}">{{ $customer->cust_name }}</option>
    @endforeach
</select>
            <button type="submit">ثبت</button>
        </form>
    </div>
     
   
 
</body>
</html>
