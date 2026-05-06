@extends('layout')

@section('content')
<div class="container mt-4">
    <h2 class="text-center text-primary mb-4">لیست داروها</h2>

    @if(session('success'))
        <div class="alert alert-success text-center">
            {{ session('success') }}
        </div>
    @endif

    <div class="table-responsive">
        <table class="table table-hover table-bordered text-center">
            <thead class="table-dark">
                {{session('del')}}
                <tr>
                    <th>نام مریض</th>
                    <th>سن مریض</th>
                    <th>اسم داکتر</th>
                    <th>نام دوا</th>
                    <th>مقدار مصرف</th>
                    <th>تعداد</th>
                    <th>قیمت فی قطی</th>
                    <th>تاریخ اجرآ نسخه</th>
                    <th>تاریخ تولید</th>
                    <th>تاریخ تغییر</th>
                    <th>عملیات</th>
                  
                </tr>
            </thead>
            <tbody>
                @foreach($presc as $prescr)
                    <tr>
 
                
                    <td>{{ $prescr->pa_name}}</td>
                    <td>{{ $prescr->pa_age }}</td> 
                    <td>{{ $prescr->Doctor->doc_name ??'نا مشخص' }}</td>
                    <td>{{ $prescr->Medication->gen_name ??'نا مشخص' }}</td>
                    <td>{{ $prescr->dosage}}</td>
                    <td>{{ $prescr->quantity }}</td>
                    <td>{{ $prescr->unit_price}}</td>
                    <td>{{ $prescr->pres_date }}</td>
                    <td>{{ $prescr->created_at }}</td>
                    <td>{{ $prescr->updated_at }}</td>
                      
                   
                        <td>
                            <a href="{{ route('pres_edit',$prescr->pre_id) }}" class="btn btn-sm btn-warning">ویرایش</a>

                            <form action="{{ route('pres_destroy', $prescr->pre_id) }}" method="POST" class="d-inline">
                                @csrf
                                @method('DELETE')
                                <button type="submit" class="btn btn-sm btn-danger" onclick="return confirm('آیا مطمئن هستید؟')">حذف</button>
                            </form>
                        </td>
                    </tr>
                @endforeach
            </tbody>
        </table>  
        <div class="d-flex justify-content-center mt-4">
            {{ $presc->links('vendor.pagination.bootstrap-5') }}
        </div>
 

    </div>
</div>
    
@endsection

<style>
    body {
        font-family: 'Tahoma', sans-serif;
        background-color: #f8f9fa;
    }

    h2 {
        font-weight: bold;
    }

    .table {
        border-radius: 10px;
        overflow: hidden;
    }

    .table th {
        background: #343a40 !important;
        color: white !important;
    }

    .table tbody tr:nth-child(odd) {
        background: #f2f2f2;
    }

    .table tbody tr:hover {
        background: #d4edda;
        transition: all 0.3s ease-in-out;
    }

    .btn {
        font-weight: bold;
        border-radius: 5px;
    }

    .btn-warning {
        background: #ffbb33;
        border: none;
    }

    .btn-danger {
        background: #dc3545;
        border: none;
    }
</style>

