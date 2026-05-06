@extends('layout')

@section('content')
<div class="container mt-4">
    <h2 class="text-center text-primary mb-4">معلومات داکتر ها </h2>

    @if(session('success'))
        <div class="alert alert-success text-center">
            {{ session('success') }}
        </div>
    @endif
                {{session('up')}}
    <div class="table-responsive">
        <table class="table table-hover table-bordered text-center">
            <thead class="table-dark">
                <tr>
                    <th>نام داکتر</th>
                    <th>تخلص</th>
                    <th>بخش  مربوطه</th>
                    <th>شماره تماس</th>      
                    <th>تاریخ ایجاد </th>
                    <th>تاریخ تغییر</th>
                    <th>عملیات</th>
                  
                </tr>
            </thead>
            <tbody>
                @foreach($doctors as $doctor)
                    <tr>
                        
                    <td>{{ $doctor->doc_name}}</td>
                    <td>{{ $doctor->doc_last_name}}</td> 
                    <td>{{ $doctor->doc_section }}</td>
                    <td>{{ $doctor->doc_phone}}</td>
                    <td>{{ $doctor->created_at }}</td>
                    <td>{{ $doctor->updated_at }}</td>
                      
                   
                    <td>
                            <a href="{{ route('doctor_edit', $doctor->doc_id) }}" class="btn btn-sm btn-warning">ویرایش</a>

                            <form action="{{ route('doctor_destroy', $doctor->doc_id) }}" method="POST" class="d-inline">
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
            {{ $doctors->links('vendor.pagination.bootstrap-5') }}
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

