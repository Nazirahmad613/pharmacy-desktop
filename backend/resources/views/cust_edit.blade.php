<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ویرایش اطلاعات  مشتریان </title>
    <style>
        body {
            font-family: 'Tahoma', sans-serif;
            direction: rtl;
            background: #f8f9fa;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }

        .container {
            background: white;
            padding: 25px;
            border-radius: 10px;
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
            width: 400px;
        }

        h2 {
            text-align: center;
            color: #333;
            margin-bottom: 20px;
        }

        label {
            font-weight: bold;
            display: block;
            margin-top: 10px;
            color: #555;
        }

        input, textarea {
            width: 100%;
            padding: 10px;
            margin-top: 5px;
            border: 1px solid #ccc;
            border-radius: 5px;
            font-size: 14px;
            box-sizing: border-box;
        }

        textarea {
            resize: none;
            height: 80px;
        }

        button {
            width: 100%;
            padding: 10px;
            margin-top: 15px;
            background-color: #14c45d;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            transition: 0.3s;
        }

        button:hover {
            background-color: #0056b3;
        }
    </style>
 
<div class="container">
    <h1>ویرایش تأمین‌کننده</h1>
    
    {{-- نمایش پیام‌های اعتبارسنجی یا خطاها --}}
    @if ($errors->any())
        <div class="alert alert-danger">
            <ul>
                @foreach($errors->all() as $error)
                    <li>{{ $error }}</li>
                @endforeach
            </ul>
        </div>
    @endif
    
    @if(session('success'))
        <div class="alert alert-success">
            {{ session('success') }}
        </div>
    @endif
    
    @if(session('error'))
        <div class="alert alert-danger">
            {{ session('error') }}
        </div>
    @endif

    
    <form action="{{ route('customer_update', $custi->customer_id) }}" method="POST">
        @csrf
        
        
        <div class="form-group">
            <label for="cust_name">نام  مشتری</label>
            <input type="text" name="cust_name" id="cust_name" class="form-control" 
                   value="{{ old('cust_name', $custi->cust_name) }}" required>
        </div>
        
        <div class="form-group">
            <label for="cust_last_name">تخلص </label>
            <input type="text" name="cust_last_name" id="cust_last_name" class="form-control" 
                   value="{{ old('cust_last_name', $custi->cust_last_name) }}" required>
        </div>
        
        <div class="form-group">
            <label for="cust_phone_num">شماره تماس</label>
            <input type="text" name="cust_phone_num" id="cust_phone_num" class="form-control" 
                   value="{{ old('cust_phone_num', $custi->cust_phone_num) }}" required>
        </div>
        
        <div class="form-group">
            <label for="cust_email">آدرس ایمل</label>
            <input type="cust_email" name="cust_email" id="cust_email" class="form-control" 
                   value="{{ old('cust_email', $custi->cust_email) }}">
        </div>
        
        <div class="form-group">
            <label for="cust_address">آدرس</label>
            <textarea name="cust_address" id="cust_address" class="form-control">{{ old('cust_address', $custi->cust_address) }}</textarea>
        </div>
        
        <button type="submit" class="btn btn-primary">به‌روزرسانی</button>
    </form>
</div>
 
