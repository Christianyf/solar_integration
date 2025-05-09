import { TestBed } from '@angular/core/testing';

import { RemoteServicesService } from './remote-services.service';

describe('RemoteServicesService', () => {
  let service: RemoteServicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RemoteServicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
