import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ReporteBusqueda } from './reporte-busqueda';

describe('ReporteBusqueda', () => {
  let component: ReporteBusqueda;
  let fixture: ComponentFixture<ReporteBusqueda>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReporteBusqueda]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReporteBusqueda);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
