@extends('layout')

@section('content')
<div class="container mt-4">
    <h2 class="text-center text-primary mb-4">لیست شرکت ها </h2>

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
                    <th>آی دی شرکت </th>
                    <th>نام شرکت</th>
                    <th>شخص ارتباطی</th>
                    <th>شماره تماس</th>
                    <th>ایمیل</th>
                    <th>آدرس شرکت</th>
                    <th>تاریخ درج</th>
                    <th>تاریخ  بروز رسانی/<th>
                 
                </tr>
            </thead>
            <tbody>
                @foreach($suppli as $supplier)
                    <tr>
                        <td>{{ $loop->iteration }}</td>
                        <td>{{ $supplier->name }}</td>
                        <td>{{ $supplier->cont_person }}</td>
                        <td>{{ $supplier->phone_num }}</td>
                        <td>{{ $supplier->email }}</td>
                        <td>{{ $supplier->address}}</td>
                        <td>{{ $supplier->created_at}}</td>
                        <td>{{ $supplier->updated_at}}</td>
                        <td>
                            <a href="{{ route('suppliers_edit', $supplier->supplier_id) }}" class="btn-warning ">ویرایش</a>
                            <form action="{{ route('supplier_destroy',$supplier->supplier_id) }}" method="POST" class="btn-danger">
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
            {{ $suppli->links('vendor.pagination.bootstrap-5') }}
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

