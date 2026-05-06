<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ویرایش اطلاعات تأمین‌کننده</title>
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

    <form action="{{route('sales_d_update', ['sales_d_id' => $salesd->sales_d_id]) }}" method="POST">
        @csrf
        

        <div class="form-group mb-3">
            <label for="sale_id"> انتخاب شماره فروشات </label>
            <select name="sale_id" id="sale_id" class="form-control" required>
                <option value="">انتخاب کنید</option>
                @foreach($sales as $saless)
                    <option value="{{ $saless->sale_id }}"
                        {{ old('sale_id', $saless->sale_id) == $saless->sale_id ? 'selected' : '' }}>
                        {{ $saless->sale_id }}
                    </option>
                @endforeach
            </select>

        <div class="form-group mb-3">
            <label for="med_id">انتخاب نام دوا</label>
            <select name="med_id" id="med_id" class="form-control" required>
                <option value="">انتخاب </option>
                @foreach($medicate as $medication)
                    <option value="{{ $medication->med_id }}" 
                        {{ old('med_id', $medication->med_id) == $medication->med_id ? 'selected' : '' }}>
                        {{ $medication->gen_name}}
                    </option>
                @endforeach
            </select>
        </div>

        <div class="form-group">
            <label for="quantity">تعداد</label>
            <input type="number" name="quantity" id="quantity" class="form-control" 
                   value="{{ old('quantity', $salesd->quantity) }}" required>
        </div>
        
        <div class="form-group">
            <label for="unit_price">قیمت فی قطی </label>
            <input type="number" name="unit_price" id="unit_price" class="form-control" 
                   value="{{ old('unit_price', $salesd->unit_price) }}">
        </div>
        
        
        
        <button type="submit" class="btn btn-primary">به‌روزرسانی</button>
    </form>
</div>
 
