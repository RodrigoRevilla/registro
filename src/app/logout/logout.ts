import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth'; 

@Component({
  selector: 'app-logout',
  templateUrl: './logout.html',
  styleUrls: ['./logout.scss']
})
export class LogoutComponent implements OnInit {

  constructor(private authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.authService.logout();  
    this.router.navigate(['/login']);
  }
}
