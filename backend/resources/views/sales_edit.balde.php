

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

    
    <form action="{{ route('suppliers_update', $supplier->supplier_id) }}" method="POST">
        @csrf
        
        <div class="form-group mb-3">
            <label for="supplier_id">انتخاب تأمین‌کننده</label>
            <select name="supplier_id" id="supplier_id" class="form-control" required>
                <option value="">انتخاب کنید</option>
                @foreach($suppliers as $supplier)
                    <option value="{{ $supplier->supplier_id }}" 
                        {{ old('supplier_id', $inventor->supplier_id) == $supplier->supplier_id ? 'selected' : '' }}>
                        {{ $supplier->name }}
                    </option>
                @endforeach
            </select>

        <div class="form-group mb-3">
            <label for="med_id">انتخاب نام دوا</label>
            <select name="med_id" id="med_id" class="form-control" required>
                <option value="">انتخاب </option>
                @foreach($medications as $medication)
                    <option value="{{ $medication->med_id }}" 
                        {{ old('med_id', $inventor->med_id) == $medication->med_id ? 'selected' : '' }}>
                        {{ $medication->gen_name}}
                    </option>
                @endforeach
            </select>
        </div>
        
        <div class="form-group">
            <label for="name">نام شرکت </label>
            <input type="text" name="name" id="name" class="form-control" 
                   value="{{ old('name', $supplier->name) }}" required>
        </div>
        
        <div class="form-group">
            <label for="cont_person">شخص ارتباطی</label>
            <input type="text" name="cont_person" id="cont_person" class="form-control" 
                   value="{{ old('cont_person', $supplier->cont_person) }}" required>
        </div>
        
        <div class="form-group">
            <label for="phone_num">شماره تماس</label>
            <input type="text" name="phone_num" id="phone_num" class="form-control" 
                   value="{{ old('phone_num', $supplier->phone_num) }}" required>
        </div>
        
        <div class="form-group">
            <label for="email">آدرس ایمل</label>
            <input type="email" name="email" id="email" class="form-control" 
                   value="{{ old('email', $supplier->email) }}">
        </div>
        
        <div class="form-group">
            <label for="address">آدرس</label>
            <textarea name="address" id="address" class="form-control">{{ old('address', $supplier->address) }}</textarea>
        </div>
        
        <button type="submit" class="btn btn-primary">به‌روزرسانی</button>
    </form>
</div>
 
