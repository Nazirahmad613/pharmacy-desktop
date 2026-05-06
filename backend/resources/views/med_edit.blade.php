<!DOCTYPE html>
<html lang="fa">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ویرایش اطلاعات دارو</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
    <style>
        body {
            background-color: #f8f9fa;
            direction: rtl;
            font-family: 'Tahoma', sans-serif;
        }
        .form-container {
            max-width: 500px;
            margin: 50px auto;
            background: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.1);
        }
        h2 {
            text-align: center;
            color: #343a40;
            font-weight: bold;
            margin-bottom: 20px;
        }
        .form-group label {
            font-weight: bold;
        }
        .btn-primary {
            background-color: #007bff;
            border: none;
            width: 100%;
            padding: 10px;
            font-size: 18px;
            border-radius: 10px;
        }
        .btn-primary:hover {
            background-color: #0056b3;
        }
        select, input {
            border-radius: 8px;
        }
    </style>
</head>
<body>

<div class="container">
    <div class="form-container">
        <h2>ویرایش اطلاعات دارو</h2>
        <form action="{{ route('medications_update', ['med_id' => $medications->med_id]) }}" method="POST">
            @csrf
            @method('PUT')

            <div class="form-group mb-3">
                <label for="supplier_id">انتخاب تأمین‌کننده</label>
                <select name="supplier_id" id="supplier_id" class="form-control" required>
                    <option value="">انتخاب کنید</option>
                    @foreach($suppliers as $supplier)
                        <option value="{{ $supplier->supplier_id }}" 
                            {{ old('supplier_id', $medications->supplier_id) == $supplier->supplier_id ? 'selected' : '' }}>
                            {{ $supplier->name }}
                        </option>
                    @endforeach
                </select>
            </div>

            <div class="form-group mb-3">
                <label for="gen_name">نام دارو</label>
                <input type="text" name="gen_name" id="gen_name" class="form-control" 
                       value="{{ old('gen_name', $medications->gen_name) }}" required>
            </div>
            
            <div class="form-group mb-3">
                <label for="dosage">مقدار مصرف</label>
                <input type="text" name="dosage" id="dosage" class="form-control" 
                       value="{{ old('dosage', $medications->dosage) }}" required>
            </div>

            <div class="form-group mb-3">
                <label for="unit_price">قیمت خرید فی قطی</label>
                <input type="number" name="unit_price" id="unit_price" class="form-control" 
                       value="{{ old('unit_price', $medications->unit_price) }}" required>
            </div>

            <div class="form-group mb-3">
                <label for="quantity">تعداد خرید دوا</label>
                <input type="number" name="quantity" id="quantity" class="form-control" 
                       value="{{ old('quantity', $medications->quantity) }}">
            </div>

            <div class="form-group mb-3">
                <label for="exp_date">تاریخ انقضا</label>
                <input type="date" name="exp_date" id="exp_date" class="form-control" 
                       value="{{ old('exp_date', $medications->exp_date) }}">
            </div>

            <button type="submit" class="btn btn-primary">به‌روزرسانی</button>
        </form>
    </div>
</div>

</body>
</html>
