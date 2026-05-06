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
    <h1>ویرایش  معلومات داکتر</h1>
 
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

    
    <form action="{{ route('doctor_update', $ddoctors->doc_id) }}" method="POST">
        @csrf
        
        
        <div class="form-group">
            <label for="doc_name">نام داکتر</label>
            <input type="text" name="doc_name" id="doc_name" class="form-control" 
                   value="{{ old('doc_name', $ddoctors->doc_name) }}" required>
        </div>
        
        <div class="form-group">
            <label for="doc_last_name">تخلص</label>
            <input type="text" name="doc_last_name" id="doc_last_name" class="form-control" 
                   value="{{ old('doc_last_name', $ddoctors->doc_last_name) }}" required>
        </div>
        
        <div class="form-group">
            <label for="doc_section">بخش  مربوطه </label>
            <input type="text" name="doc_section" id="doc_section" class="form-control" 
                   value="{{ old('doc_section', $ddoctors->doc_section) }}">
        </div>
        
        <div class="form-group">
            <label for="doc_phone">شماره تماس</label>
            <textarea name="doc_phone" id="doc_phone" class="form-control">{{ old('doc_phone', $ddoctors->doc_phone) }}</textarea>
        </div>
        
        <button type="submit" class="btn btn-primary">به‌روزرسانی</button>
    </form>
</div>
 
